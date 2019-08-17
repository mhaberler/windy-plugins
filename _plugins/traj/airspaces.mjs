    import $ from '@windy/$';
    import pickerT from './pickerTools.mjs';
    import map from '@windy/map';
    import interpolator from '@windy/interpolator';
    import bcast from '@windy/broadcast';
    import store from '@windy/store';
    import picker from '@windy/picker';
    import utils from '@windy/utils';
    import rs from '@windy/rootScope';


    let cntdiv=[],cnttxt=[],cntmsg=[],cntremove=[];
    let catAr=[];

    //load airspace list
    let fetchTries=0;
    let countries=[];

    let aspOpac=0.4;



    let url="https://www.openaipgeojson.com/";
    //let url="https://www.flymap.co.za/openaipgeojson/";

    let fetchCountryList=()=>{
        fetch(url+"countries.json").then((r)=>r.json()).then(r=>{
            countries=r;
            countries.forEach((e,i)=>{
                cntdiv[i]=document.createElement("div");
                cntdiv[i].className="airspace-div";
                cnttxt[i]=document.createElement("span");
                let s=e.name.slice(0,-3); s=s[0].toUpperCase()+s.slice(1);
                for (let j=0,l=s.length;j<l;j++)if(s[j]=="_")s=s.slice(0,j)+" "+s[j+1].toUpperCase()+s.slice(j+2);
                cnttxt[i].innerHTML=s;
                cnttxt[i].dataset.i=i;
                cnttxt[i].className="airspace-div-txt";
                cnttxt[i].addEventListener("click",n=>{
                    let thisN=n.srcElement;
                    if (!countries[i].asp)cntmsg[i].style.display="inline-block";
                    thisN.style.fontWeight="bold"; thisN.style.fontSize="14px"; thisN.style.opacity=1;
                    fetchAsp(i);
                });

                cntremove[i]=document.createElement("span");
                cntremove[i].className="closing-x-small";
                cntremove[i].dataset.i=i;
                cntremove[i].addEventListener("click",n=>{
                    let thisN=n.srcElement;
                    map.removeLayer(countries[i].gjLayer); delete countries[i].gjLayer;
                    cnttxt[i].style.fontWeight="normal"; cnttxt[i].style.fontSize="13px"; cnttxt[i].style.opacity=0.9;
                    thisN.style.display="none";
                });

                cntmsg[i]= document.createElement("span");
                cntmsg[i].style.display="none";
                cntmsg[i].innerHTML="&nbsp;&nbsp;&nbsp;Loading....";

                cntdiv[i].appendChild(cnttxt[i]);
                cntdiv[i].appendChild(cntremove[i]);
                cntdiv[i].appendChild(cntmsg[i]);
                document.getElementById("aipdiv").appendChild(cntdiv[i]);
            });
        }).catch(error=>{
            console.error('Error:', error, 'Attempt',fetchTries);
            fetchTries++;
            if(fetchTries<10){
                if (fetchTries==3)url="https://www.flymap.co.za/openaipgeojson/";
                setTimeout(fetchCountryList,1000);
            }
            else document.getElementById("aipdiv").innerHTML="Failed to load country list.<br>You can try to reload plugin.";
        });
    }
    fetchCountryList();

    const fetchAsp=i=>{
            let bnds=countries[i].bounds[0];
            map.panTo([(bnds[1][0]-bnds[0][0])/2,(bnds[1][1]-bnds[0][1])/2]);
            map.fitBounds(bnds);
            if (!countries[i].fetched){
                countries[i].fetched=true;
                fetch(`${url+countries[i].name}.geojson`).then((r)=>r.json()).then(r=>{
                    countries[i].asp=r;
                    load(i);
                }).catch(err=>{
                    countries[i].fetched=false;
                    console.log("failed to fetch");
                });
            } else if (!countries[i].gjLayer)load(i);
    }

    //load airspace as layer
    const load=i=>{
        countries[i].gjLayer=L.geoJSON(countries[i].asp,{
            style: feature=>{return {weight:1, fill:0, opacity:aspOpac, color:aspColor(feature.properties.CAT)};}
        }).addTo(map);

        cntmsg[i].style.display="none"
        cntremove[i].style.display="inline-block";
        //console.log(countries[i].gjLayer);
    }

    const aspColor=n=>{
        for (var ii=0;ii<catAr.length&&catAr[ii]!=n;ii++);
        if (ii==catAr.length)catAr.push(n);

        switch (n) {
            case 'RESTRICTED':  return "lightpink";     break;
            case 'PROHIBITED':  return "orange";           break;
            case 'DANGER':      return "orangered";     break;
            case 'CTR':         return "lightblue";     break;
            case 'A':           return "aliceblue";     break;
            case 'C':           return "cyan";     break;
            case 'D':           return "aqua";     break;
            case 'E':           return "peachpuff";     break;
            case 'F':           return "lawngreen";     break;
            case 'B':           return "lightcyan";          break;
            case 'G':           return "lightyellow";     break;
            case 'TMZ':         return "lightgreen";    break;
            case 'WAVE':        return "mistyrose";     break;
            case 'RMZ':         return "palegreen";     break;
            case 'gliding':     return "lightsalmon";     break;
            case 'FIR':         return "aquamarine";     break;
            default:            return "white";
        }
    }

    //algorithm from github - substack - point-in-polygon, MITlic
    const checkPoly= function(point, vs) {
        var x = point[0], y = point[1];
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];
            var intersect = ((yi > y) != (yj > y))
             && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    let prevLayerAr=[];  //previously found layers

    ////find airspace:

    function findAsp(e){

        let c= [e.lon||e.lng,e.lat]; //points obj for geojson
        let cc = [e.lat,e.lon||e.lng];//points obj for leaflet

        let txt="";
        let layerAr=[]; // found layers

        let cntryBounds=i=>{
            for(let j=0,l=countries[i].bounds.length;j<l;j++){
                let bnds=L.bounds(countries[i].bounds[j]);
                if (bnds.contains(cc)) return true;
            }
            return false;
        }

        //countries.forEach((cntry,i)=>{
        for (let i=0; i<countries.length; i++){
            let cntry=countries[i];
            if (cntry.gjLayer && cntryBounds(i)){
                    cntry.gjLayer.eachLayer(e=>{
                        let b=L.bounds(e.feature.properties.bnd);
                        if (b.contains(cc)){    //airspace bounds stored in properties.
                            if(checkPoly(c,e.feature.geometry.coordinates[0])){
                                txt+=
                                `<div onclick='let d=this.nextElementSibling; if(d.style.display=="none"){d.style.display=""}else{d.style.display="none"}' style='color:${aspColor(e.feature.properties.CAT)}; cursor:pointer; z-Index:999; word-wrap:normal;'>${e.feature.properties.N}&nbsp;&nbsp;&nbsp;</div>
                                <div style='display:none'><span style='font-size:10px;'>&nbsp;&nbsp;Cat:&nbsp;${e.feature.properties.CAT}</span>
                                <br><span style='font-size:10px;'>&nbsp;&nbsp;${e.feature.properties.AB}${e.feature.properties.AB_U}-${e.feature.properties.AT}${e.feature.properties.AT_U}</span></div>`;
                                layerAr.push(e);
                                e.setStyle({color:aspColor(e.feature.properties.CAT),  weight:2, opacity:1});
                            }
                        }
                    });
            }
        };
        prevLayerAr.forEach(e=>{
                        let id=e._leaflet_id;
                        for(var k=0,ll=layerAr.length;k<ll&&id!=layerAr[k]._leaflet_id;k++);
                        if (k==ll) e.setStyle({color:aspColor(e.feature.properties.CAT),  weight:1, opacity:aspOpac});
        });
        prevLayerAr=layerAr.map(e=>e);

        return txt;
        //if($("#picker_asp"))$("#picker_asp").innerHTML=txt;
        //if (txt) pickerT.showRightDiv();
        //else pickerT.hideRightDiv();
    };

    function clearAsp(){   //clear all airspaces
        prevLayerAr.forEach(e=>{
            e.setStyle({color:aspColor(e.feature.properties.CAT),  weight:1, opacity:0.4});
        });
        prevLayerAr=[];
    }

    function opac(op){   //change opacity
        aspOpac=op/100;

        for (let i=0; i<countries.length; i++){
            let cntry=countries[i];
            if (cntry.gjLayer){
                cntry.gjLayer.eachLayer(e=>{
                    if (prevLayerAr.findIndex(pl=> pl._leaflet_id==e._leaflet_id)<0)
                        e.setStyle({color:aspColor(e.feature.properties.CAT),  weight:1, opacity:aspOpac});
                });
            }
        };
    }

export default {findAsp, clearAsp, opac};