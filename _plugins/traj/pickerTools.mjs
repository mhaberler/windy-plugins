import map from '@windy/map'
import picker from '@windy/picker'
import $ from '@windy/$'
import rs from '@windy/rootScope'
import bcast from  '@windy/broadcast'

let pckr={_icon:null};
let pdr,pdl;
let pckEl;

////send text to picker div.
function mobileDiv(d){
    if($("#plugin-picker")){
        pckEl=$("#plugin-picker");
        pckEl.style.position="fixed";
        let pda=document.createElement("div");
        pda.classList.add("picker-anchor-mobl");
        pckEl.appendChild(pda);
        d.classList.add("picker-div-mobl");
        pda.appendChild(d);
    }
}
function addContent(html,el){
    if (html){
        el.style.display="block";  
        if (html.nodeName=="DIV"){
            if (html.innerHTML){
                for(;el.firstChild;)el.firstChild.remove();
                el.appendChild(html);
            }  else el.style.display="none";
        } else el.innerHTML=html;
    } else {
        el.style.display="none";
    }
}
function fillRightDiv(html){
    if(!$("#picker-div-right")){
        pdr=document.createElement("div");
        pdr.id="picker-div-right";
        if(!rs.isMobile){
            if(document.getElementsByClassName("picker-content noselect")[0]){
                pckEl=document.getElementsByClassName("picker-content noselect")[0];
                pckEl.parentNode.style.outlineStyle="none";  //on my tablet long touching picker causes a persistent orange outline.  this stops it.
                pckEl.appendChild(pdr);
                pdr.classList.add("picker-div-desk");
            }
        } else mobileDiv(pdr);
    }
    addContent(html,pdr);
}
function fillLeftDiv(html){
    if(!$("#picker-div-left")){
        pdl=document.createElement("div");
        pdl.id="picker-div-left";
        pdl.style.position="absolute";

        if(!rs.isMobile){
            if(document.getElementsByClassName("picker-content noselect")[0]){
                pckEl=document.getElementsByClassName("picker-content noselect")[0];
                pckEl.parentNode.style.outlineStyle="none";
                let pda=document.createElement("div");
                pckEl.appendChild(pda);
                pda.style.top="0px";
                pda.style.width="0px";
                pda.style.position="absolute";
                pda.appendChild(pdl);
                pdl.classList.add("picker-div-desk");
            }
        } else mobileDiv(pdl);
    }
    addContent(html,pdl);
}
function hideLeftDiv() { if(pdl)pdl.style.display="none"; }
function hideRightDiv(){ if(pdr)pdr.style.display="none"; }
function showLeftDiv() { if(pdl)pdl.style.display="block"; }
function showRightDiv(){ if(pdr)pdr.style.display="block"; }


////picker drag listener
function drag(cbf, interv=100){          //by default the picker is cbf is requested every 100ms when dragged.
    let tries=0;
    let ready=true;
    let dragStopped=true;
    let mapMovef=e=>{
        dragStopped=false;
        if (ready){
            let ll=map.containerPointToLatLng([0,180]);
            ll.lon=ll.lng=map.getCenter().lng;
            cbf(ll);
            ready=false;
            setTimeout(()=>{
                ready=true;
                setTimeout(()=>{
                    if (ready && !dragStopped){
                        let ll=map.containerPointToLatLng([0,180]);
                        ll.lon=ll.lng=map.getCenter().lng;
                        cbf(ll);
                    }
                },interv)
            },interv);
        }
    }
    let pckrMovef=e=>{
        dragStopped=false;
        if (ready){
            let ll=e.target._latlng;
            ll.lon=ll.lng;
            cbf(ll);
            ready=false;
            setTimeout(()=>{
                ready=true;
                setTimeout(()=>{
                    if (ready && !dragStopped){
                        let ll=e.target._latlng;
                        ll.lon=ll.lng;
                        cbf(ll);
                    }
                },interv)
            },interv);
        }
    }
    let wait4pckr=()=>{
        if (!rs.isMobile){
            if (!pckr._icon){
                map.eachLayer(l=>{
                    if(l.options&&l.options.icon&&l.options.icon.options.className=="picker open"){
                        pckr=l;
                        tries=0;
                        pckr.on("drag",pckrMovef);
                    }
                });
                if (!pckr._icon){tries++;if(tries<10)setTimeout(wait4pckr,200);}
            }
        } else {
            map.on("move",mapMovef)
        }
    }
    wait4pckr(); //in case picker already open.
    let remListeners=()=>{
        if(rs.isMobile) map.off("move",mapMovef);
        else pckr.off("drag",pckrMovef); ////probably not necessary.
    }
    bcast.on("pluginOpened",e=>{
        if (e=="picker") setTimeout(()=>{ if (pckr._icon==null) wait4pckr() },500);  // check if pickeropened by search etc.. (when picker.on("pickerOpened") not triggered)
    });
    picker.on("pickerOpened",()=>wait4pckr());
    picker.on("pickerClosed",()=>remListeners());
    picker.on('pickerMoved', ()=>{dragStopped=true});
}

export default {fillRightDiv, fillLeftDiv, hideRightDiv, showRightDiv, hideLeftDiv, showLeftDiv, drag}