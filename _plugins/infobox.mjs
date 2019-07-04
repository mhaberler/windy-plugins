
	import bcast from '@windy/broadcast';
    import rs from '@windy/rootScope';
    import $ from '@windy/$';
    import store from '@windy/store';
    import bcast from '@windy/broadcast';






    function makeInfoBox(content,startId,pluginId,_this){  //startId = provide plug in element id to show or hide plugin, on clicking box


        let hide=()=>{
            let st={visibility: 'hidden',opacity: '0', transition: 'visibility 0s 0.5s, opacity 0.5s linear'};
            for (let p in st) info.style[p]=st[p];
        }
        let show=()=>{
            let st={visibility: 'visible', opacity: '1', transition: 'opacity 0.5s linear'};
            for (let p in st) info.style[p]=st[p];
        }

        let info=document.createElement("div");
        let st={position:"absolute",  marginLeft:"11px", pointerEvents:"none",  width:"100%",  backgroundColor:"transparent",
                 padding:"3px",  lineHeight:"1.1"};
        for (let p in st) info.style[p]=st[p];
        info.innerHTML=content;

        if (rs.isMobile){
            info.style.bottom="140px";
            setTimeout(()=>{  //move down if enough space
                if(info.offsetWidth+20<(window.innerWidth-$("#mobile_box").offsetWidth)/2) info.style.bottom="110px";
            });
        }
        else if (rs.isTablet){
             info.style.bottom=((store.get('overlay')=="radar")?180:110)+"px";
        }
        else info.style.bottom=((store.get('overlay')=="radar")?140:70)+"px";

        if(rs.isMobile) $("#mobile-calendar").appendChild(info);
        else{
            $('#bottom').appendChild(info);
            store.on('overlay',e=>{
                info.style.bottom=(rs.isTablet?(e=="radar"?200:110):(e=='radar'?160:70))+"px";
            });
        }



        //if (pluginId)hide();
        if (startId) $("#"+startId).addEventListener("click",()=>{
            bcast.emit('rqstOpen',pluginId);
            //hide();
        });

       /* _this.onopen = () =>  { hide(); }
        _this.onclose = () => { show(); }*/
	}
    export default makeInfoBox;
