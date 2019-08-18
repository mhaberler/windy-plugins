////rplanner plugin

import map from '@windy/map';
import $ from '@windy/$';
import bcast from  '@windy/broadcast';
import picker from  '@windy/picker';
import rs from '@windy/rootScope';


    let rplan=W.plugins.rplanner;


    let calendarDiv=$("#calendar")?$("#calendar").innerHTML:"";

    let scrollpos=0;
    let xpos=0;
    let mapclickAr;
    let allowMoveInfo=true;
    let mustHideDot=true;
    let overCanvas=false;

    let elevBut, boatBut, vfrBut, carBut;
    let openPluginBtn, toggleDist;

    window.addEventListener("beforeunload",e=>{
        if (overCanvas){
            e.preventDefault(); e.returnValue = '';  return false;
        }
    });

    console.log(bcast);

    let rp={
        canvasw:0,
        mrgn:0,
        isOpen:false,
        myPlugin:"",
        helpText:"",
        openPluginText:"",
        left:0,
        interactive:false,
        pathsDisplay:"none",
        distanceDisplay:"none",
        dotOpacity:0.3,
        altAr:[],

        loadRP:(
            fp,  //[ { coords: {lat: lat, lng: lng},  altit: altitude in meter }, ... ]
            options,
            sendPosition,     //sendPosition is callback function to which position as ratio 0-1 along route is sent.
            onCloseCbf
        )=>{
            if (rs.isMobile){
                console.log("Not working in mobile");
                return "Not working in mobile";
            } else if (fp.length<2){
                console.log("Not enough waypoints");
                return "Not enough waypoints";
            }else  {

                rp.fp=fp;
                for(let p in options)
                    if (rp.hasOwnProperty(p))rp[p]=options[p];
                 //let opts=["myPluginName","helpText","openPluginText","left","interactive","pathsDisplay","distanceDisplay","dotOpacity"];
                    //let i=opts.indexOf(p);

                rp.sendPosition=sendPosition;
                rp.onCloseCbf=onCloseCbf;
                rp.elevs=false;
                rp.wpx=[];
                rp.myPlugin=W.plugins[rp.myPlugin];
                console.log(rp);

                let routestr="";
                for (let i=0; i<fp.length; i++){ routestr+=fp[i].coords.lat+","+fp[i].coords.lng+"; "}
                routestr=routestr.slice(0,-2);
                rplan.open(routestr);
                W.http.get("/rplanner/v1/elevation/" +routestr).then((res,rej)=>{
                    rp.elevs=res;
                });
                if (rplan.isOpen) setTimeout(()=>{
                    rp.recalc();
                    setOptions();
                },500);     //if not open,  recalc and setOptions will be called from pluginOpened listener.
                return true;
            }
        },

        setLeft:lft=>{
            if (rplan.isOpen){
                setTimeout(()=>{
                    rplan.element.style.left=lft+"px";
                    rplan.element.style.width= `calc(100% - ${lft}px)`;
                    openPluginBtn.style.display=lft?"none":"block";
                    elevBut.click(); vfrBut.click();
                    let count=0;
                    let f=()=>{
                        count++;
                        if (rplan.refs.svg.children.length>3 && rp.elevs)setTimeout(rp.recalc,500);
                        else {if(count<100)setTimeout(f,100);else console.log("LOADING TIMED OUT");}
                    };f();
                },500);
            }
        },

        recalc:()=>{   //Obtain canvas width,  margin,  then offset in pixels for each waypoint and store as wpx, then make altitude path.
            if(rp.canvasw!=rplan.refs.canvas.offsetWidth){
                rp.canvasw=rplan.refs.canvas.offsetWidth;
                let col=rplan.refs.svg.children;  //col=htmlcollection
                for (let i=0; i<col.length;i++){
                    if (col[i].classList.contains("labels-waypoint")){
                        let e=col[i].children;
                        rp.wpx=[];
                        for(let j=0;j<e.length;j++){
                                if (e[j].nodeName=="circle")rp.wpx.push(e[j].cx.baseVal.value);
                            }
                    }
                    if (col[i].classList.contains("labels-distance"))  rp.mrgn=col[i].children[0].x.baseVal[0].value;
                }
                rp.wpx.splice(0,0,rp.mrgn);
                rp.wpx.push(rp.canvasw-rp.mrgn);
                if (rp.altSvg) {
                    let vb=`0 0 ${rp.canvasw} 150`;
                    rp.altSvg.style.width=rp.canvasw+"px";
                    rp.altSvg.setAttributeNS(null, "viewBox", vb);
                }
                if (rp.altPath){
                    let pth=rp.makeAltPath();
                    rp.altPath.setAttributeNS(null, 'd', rp.makeAltPath());
                }
            }
        },
        makeAltPath:w=>{
            if (rp.altAr.length || fp[0].hasOwnProperty("altit")){

                const {fp,wpx,mrgn}=rp;
                if ((typeof w) === "undefined")w=rp.canvasw-mrgn*2;
                let d=rp.elevs.data.distances;
                let elev=rp.elevs.data.elevations;

                if (!rp.altAr.length){
                    for (let i=0;i<wpx.length;i++){
                        rp.altAr.push({x:(wpx[i]-mrgn)/w,altit:fp.altit});
                    }
                }

                let ypx=3.28084*150/12000;  //meter to pixels
                let dtot=d[d.length-1];
                //let xpx=w/d[d.length-1];
                let y=(elev[0]*ypx);
                //let x=rp.mrgn;
                let pth=`M${mrgn} ${(150-y)} `;
                let xi=1;

                let add2path=(x,y,el)=>{
                    if (el>y)y=el;
                    pth+=`L${(x*w)+mrgn} ${(150-y*ypx)} `;
                };

                for (let j=0;j<elev.length;j++){
                    let xd=d[j]/dtot;
                    for(; xi<rp.altAr.length-1 && rp.altAr[xi+1].x<xd; xi++){
                        add2path(rp.altAr[xi+1].x,rp.altAr[xi+1].altit,elev[j]);
                    }
                    if (xi<rp.altAr.length-1){
                        let xrtio=(xd-rp.altAr[xi].x) / (rp.altAr[xi+1].x-rp.altAr[xi].x);
                        let yy= rp.altAr[xi].altit + xrtio*(rp.altAr[xi+1].altit-rp.altAr[xi].altit);
                        add2path(xd,yy,elev[j]);
                    }

                    //x=rp.mrgn+xpx*d[j];
                    //let i=wpx.findIndex(e=>e>x)-1;
                    //let a=i<0?elev[j]:fp[i].altit;
                    //if (a<70)a=elev[j]; else if (a<330) a=elev[j]+100;
                    //y=(a<elev[j]?elev[j]:a)  *ypx;


                }
                add2path(1,0,elev[elev.length-1]);

                return pth;
            }
        },

        getDistanceIcons:()=>{
            rp.distanceIcons=[];
            map.eachLayer(l=>{
                if(l.options && l.options.icon && l.options.icon.options.className=="distance-icon"){
                    rp.distanceIcons.push(l._icon);
                }
            });
        },

        getPaths:()=>{
            rp.paths=[];
            map.eachLayer(l=>{
                if(l._container && l._container.nodeName=="svg"){
                    let c=l._container.children;
                    for (let k=0;k<c.length;k++){
                        if (c[k].id=="segment-labels"){rp.distLabels=l._container.children[k];}
                        else{
                            let pths=c[0].children;
                            for (let i=0;i<pths.length;i++){
                                let strk=pths[i].attributes["stroke"].nodeValue;
                                let strkw=pths[i].attributes["stroke-width"].nodeValue;
                                let strko=pths[i].attributes["stroke-opacity"].nodeValue;
                                if(strk=="white"&&strkw=="4"&&strko=="0.8")rp.paths.push(pths[i]);
                            }
                        }
                    }
                }
            });
        },

        setInteractive:interact=>{
            console.log("setInteract");
            setTimeout(()=>{
                rp.getDistanceIcons();
                if (interact){
                    rp.distanceIcons.forEach(e=>{
                        e.style.pointerEvents="auto";
                        e.style.opacity=1;

                        //map.on("click",mapclick);
                    });
                    restoreMapClicks();
                    rp.interactive=true;
                } else {
                    rp.distanceIcons.forEach(e=>{
                        e.style.pointerEvents="none";
                        e.style.opacity=0.7;

                        //map.off("click");
                    });
                    stopMapClicks();
                    rp.interactive=false;
                }
            },200);
        },

        setPathsDisplay:(val="initial")=>{
            if(val===true)val="initial"; else if (val===false)val="none";
            rp.pathsDisplay=val;
            setTimeout(()=>{
                rp.getPaths();
                rp.paths.forEach(e=>e.style.display=val);
            },200);
        },

        setDistanceDisplay:(val="initial")=>{
            if(val===true)val="initial"; else if (val===false)val="none";
            toggleDist.innerHTML=val=="initial"?"Hide Dist":"Show Dist";
            rp.distanceDisplay=val;
            setTimeout(()=>{
                rp.getPaths();
                rp.distLabels.style.display=val;
            },200);
        },

        opacityFlashingDot:op=>{
            setTimeout(()=>{
                map.eachLayer(l=>{
                    if(l.options&&l.options.icon&&l.options.icon.options.className=="icon-dot") l._icon.style.opacity=op;
                });
            },100);
        },

        moveSliderLine:v=>{
             if (rplan.isOpen){
                xpos= rp.mrgn+(rp.canvasw-rp.mrgn*2)*v;
                let visible=rplan.element.offsetWidth-rplan.refs.distance.offsetWidth;
                if (xpos>scrollpos+visible-40){scrollpos=xpos-visible+40}
                else if (xpos<scrollpos+20){scrollpos=xpos-20}
                rplan.refs.dataTable.scrollLeft= scrollpos;
                rplan.refs.canvas.onmousemove({offsetX:xpos});
                if (mustHideDot) {
                    rp.opacityFlashingDot(rp.dotOpacity);
                    mustHideDot=false;
                }
            }
        },

        close:e=>{
            if ((typeof e)!=="undefined" || !e) rplan.close(); //if not from clicking closing-x
            //map.on("click",mapclick);
            restoreMapClicks();
            rp.isOpen=false;
            allowMoveInfo=true;
            mustHideDot=true;
            overCanvas=false;
            scrollpos=0;
            if(typeof rp.onCloseCbf ==="function")
            rp.onCloseCbf();
        }
    }

   // bcast.on("mapChanged",e=>{console.log(e); });


    function setOptions(){
        console.log("set options");
        rp.setInteractive(rp.interactive);
        rp.setPathsDisplay(rp.pathsDisplay);
        rp.setDistanceDisplay(rp.distanceDisplay);
    }

    function stopMapClicks(){ //stop anon functions (which is the windy mapclick fxs),  reattach named functions
        map.off("click");
        mapclickAr.forEach(fn=>{
            if (fn.name){map.on("click",fn)}
        })
    }
    function restoreMapClicks(){ //restore all click functions stored in mapclickAr
        map.off("click");
        mapclickAr.forEach(fn=>map.on("click",fn));
    }

    bcast.on("pluginOpened",e=>{if (e=="rplanner") {

        //////creates DOM elements and sets listeners
        console.log("RPLANNER Opened");
        bcast.fire("rqstClose",picker);

        //grab mapclick fxs
        mapclickAr=map._events.click.map(e=>e.fn);

        rp.isOpen=rplan.isOpen;
        let myPlugin=W.plugins[rp.myPluginName];
        rp.canvasw=0;
        if(!rplan.refs.calendar.innerHTML) rplan.refs.calendar.innerHTML=calendarDiv;  //calender div in the rplanner not filled when resizing,  pick up when main plugin loaded.

        setTimeout(setOptions,500);//wait for elements to appear

        rplan.refs.canvas.addEventListener("mouseenter", e=> {
            xpos=e.offsetX;
            overCanvas=true;
            rp.opacityFlashingDot(rp.dotOpacity);
            mustHideDot=false;
        });

        rplan.refs.canvas.addEventListener("mouseout", ()=>{
            overCanvas=false;
            mustHideDot=true;
        });

        rplan.refs.canvas.addEventListener("mousemove",e=>{
            if (scrollpos==rplan.refs.dataTable.scrollLeft){
                xpos=e.offsetX;
                rp.ratio=(xpos-rp.mrgn)/(rp.canvasw-rp.mrgn*2);
                if(allowMoveInfo){
                    rp.sendPosition(rp.ratio);
                    allowMoveInfo=false;
                    setTimeout(()=>{
                        allowMoveInfo=true;
                        setTimeout(()=>{if(allowMoveInfo)rp.sendPosition(rp.ratio)},50);
                    },50);
                }
            }
        });

        rplan.refs.dataTable.addEventListener("scroll",e=>{
            if(rplan.refs.dataTable.scrollLeft>0 || Math.abs(rplan.refs.dataTable.scrollLeft-scrollpos)<40){
                scrollpos=rplan.refs.dataTable.scrollLeft;
            } else {
                rplan.refs.dataTable.scrollLeft=scrollpos;
            }
        });

        rplan.element.style.transition="left 0.4s";

        openPluginBtn=document.createElement("div");
        openPluginBtn.innerHTML=rp.openPluginText;
        openPluginBtn.classList.add("rplanner-button");
        openPluginBtn.style.top="-47px";
        openPluginBtn.style.display= rp.myPlugin.isOpen?"none":"block";
        openPluginBtn.addEventListener("click",()=> rp.myPlugin.open());
        rplan.element.appendChild(openPluginBtn);

        toggleDist=document.createElement("div");
        toggleDist.innerHTML="Hide Dist";
        toggleDist.classList.add("rplanner-button");
        toggleDist.style.top="-20px";
        toggleDist.addEventListener("click",(e)=>{
            let tx=e.target.innerHTML;
            if (tx=="Hide Dist"){
                rp.setDistanceDisplay(false);
            } else {
                rp.setDistanceDisplay(true);
            }
        });
        rplan.element.appendChild(toggleDist);

        let infoBut=document.createElement("div");
            infoBut.innerHTML="?";
            infoBut.classList.add("rplanner-button");
            infoBut.style.top="-20px";
            infoBut.style.width="24px";
            infoBut.style.fontWeight="bold";
            infoBut.style.left="2px";
            infoBut.onclick=()=>helpBox.style.display=helpBox.style.display=="none"?"block":"none";
        rplan.element.appendChild(infoBut);

        let helpBox=document.createElement("div");
            helpBox.classList.add("rplanner-help-box");
            helpBox.innerHTML=rp.helpText+
            `<div onclick="this.parentElement.style.display='none'" class="rplanner-button" style="position:relative; width:30px; left:calc(100% - 40px);">OK</div>`;
            rplan.element.appendChild(helpBox);

        for (let e of rplan.element.children){
            if (e.classList.contains("closing-x")){
                e.classList.add("my-rplanner-closing-x");
                e.style.fontSize="22px";
                e.style.top="-47px";
                e.addEventListener("click",rp.close);
            }
        }

        let xmlns = "http://www.w3.org/2000/svg";
        rp.altSvg = document.createElementNS(xmlns, "svg");
        rp.altSvg.setAttributeNS(null, 'preserveAspectRatio', "none");
        rp.altSvg.setAttributeNS(null, "height", 150);
        rp.altSvg.style.display="none";
        rp.altSvg.style.pointerEvents="none";
        rp.altSvg.style.position="absolute";

        rp.altPath = document.createElementNS(xmlns, "path");
        rp.altPath.setAttributeNS(null, 'stroke', "magenta");
        rp.altPath.setAttributeNS(null, 'stroke-width', 1);
        rp.altPath.setAttributeNS(null, 'stroke-linejoin', "round");
        rp.altPath.setAttributeNS(null, 'd', "");
        rp.altPath.setAttributeNS(null, 'fill', "none");
        rp.altPath.setAttributeNS(null, 'opacity', 1.0);
        //rp.altPath.setAttributeNS(null, 'width', "100%");
        //rp.altPath.setAttributeNS(null, 'height', "100%");
        rp.altSvg.appendChild(rp.altPath);

        rplan.refs.dataTable.appendChild(rp.altSvg);

        boatBut=$("[data-do='set,boat']");
        elevBut= $("[data-do='set,elevation']");
        vfrBut=$("[data-do='set,vfr']");
        carBut=$("[data-do='set,car']");
        vfrBut.addEventListener("click", ()=>{rp.altSvg.style.display="block";});
        boatBut.addEventListener("click", ()=>{rp.altSvg.style.display="none";});
        carBut.addEventListener("click", ()=>{rp.altSvg.style.display="none";});
        elevBut.addEventListener("click", ()=>{rp.altSvg.style.display="none";});
        vfrBut.click();

        console.log(rp.myPlugin.isOpen);
        setTimeout(()=>rp.setLeft(rp.myPlugin.isOpen?rp.left:0),500);
    }});

export default rp;