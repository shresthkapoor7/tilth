import {furnishings,magmaBank} from '../world.js';
import {cropAlpha,drawInkShell} from './ink-study.js';

export const ENVIRONMENT_KEYS=['terrain','building-inn','building-smith','building-home','bridge','forge','outdoor-anvil','crate','fence','rock','tree','brazier','hearth','shelf','indoor-anvil'];
export const interiorAsset=type=>type==='anvil'?'indoor-anvil':type;

function blit(c,asset,p){const s=asset.crop;c.drawImage(asset.image,s.sx,s.sy,s.sw,s.sh,p.x,p.y,p.w,p.h)}
function trace(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()}
function warmLight(c,x,y,r,alpha){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,157,72,${alpha})`);g.addColorStop(1,'rgba(255,115,30,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}

// Prepared scenery only. Collision construction, actors and game state stay in Tilth.
export function createEnvironmentArt({onChange}){
 const assets={},cache=new Map();let layout=[],room=null,loaded=false,enabled=true,error=null,loading=0,ready;
 const panel=document.createElement('section');panel.id='environmentArt';panel.setAttribute('aria-label','Environment art controls');
 panel.innerHTML='<span>ENVIRONMENT</span><div><button id="environmentInk" aria-pressed="true">Ink</button><button id="environmentPixel" aria-pressed="false">Pixel</button></div><p id="environmentNote"></p><button id="environmentRetry" hidden>Retry artwork</button>';document.body.append(panel);
 function sync(){
  const visible=room!=='inn'&&room!=='generated';panel.hidden=!visible;document.body.classList.toggle('environment-art',visible);document.body.classList.toggle('environment-ink',visible&&enabled&&loaded);
  panel.querySelector('#environmentInk').setAttribute('aria-pressed',String(enabled));panel.querySelector('#environmentInk').disabled=!loaded;
  panel.querySelector('#environmentPixel').setAttribute('aria-pressed',String(!enabled));
  panel.querySelector('#environmentNote').textContent=error?'Artwork could not load. The pixel map remains playable.':!loaded?`Loading prepared scenery ${loading}/18…`:enabled?'Cinderwatch, in ink.':'Original pixel scenery.';
  panel.querySelector('#environmentRetry').hidden=!error;
 }
 function choose(value){enabled=value;sync();onChange();document.querySelector('#world').focus()}
 panel.querySelector('#environmentInk').onclick=()=>choose(true);panel.querySelector('#environmentPixel').onclick=()=>choose(false);
 panel.querySelector('#environmentRetry').onclick=()=>{ready=null;error=null;loading=0;void load()};
 const sources=[...ENVIRONMENT_KEYS.map(key=>({key,url:`/art/environment/${key}-v1.webp`,transparent:key!=='terrain'})),...['bed','table','chest'].map(key=>({key,url:`/art/study/tilth-${key}-v2.png`,transparent:true}))];
 function load(){
  if(ready)return ready;sync();
  ready=Promise.all(sources.map(async({key,url,transparent})=>{
   const image=new Image();image.src=url;await image.decode();assets[key]={image,crop:transparent?cropAlpha(image):{sx:0,sy:0,sw:image.width,sh:image.height}};loading++;sync();
  })).then(()=>{loaded=true;error=null;rebuild();sync();onChange();return true}).catch(()=>{error=true;sync();onChange();return false});
  return ready;
 }
 function surface(draw){const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1200;const c=canvas.getContext('2d');c.scale(2,2);c.imageSmoothingEnabled=true;draw(c);return canvas}
 function rebuild(){
  if(!loaded)return;cache.clear();
  cache.set('outside',surface(c=>{
   c.drawImage(assets.terrain.image,0,0,800,600);
   // Mark the exact authored hazard boundary, then lay the safe bridge over it.
   trace(c,magmaBank);c.strokeStyle='#171f20';c.lineWidth=2;c.stroke();
   for(const p of layout){
    if(p.asset!=='bridge'){c.fillStyle='#07171838';c.beginPath();c.ellipse(p.x+p.w/2,p.y+p.h-1,Math.max(3,p.w*.35),Math.min(4,p.h*.06),0,0,Math.PI*2);c.fill()}
    blit(c,assets[p.asset],p);
   }
   for(const p of layout){if(p.asset==='brazier')warmLight(c,p.x+p.w/2,p.y+p.h*.3,40,.16);if(p.asset.startsWith('building-'))for(const dx of [.22,.78])warmLight(c,p.x+p.w*dx,p.y+p.h*.68,24,.12)}
   warmLight(c,472,310,64,.16);
   c.fillStyle='#182324';c.fillRect(344,75,48,18);c.fillStyle='#977957';c.fillRect(344,75,48,1);c.font='11px VT323';c.textAlign='center';c.fillStyle='#e5b879';c.fillText('CALDERA ↑',368,88);
  }));
  for(const name of ['smith','home'])cache.set(name,surface(c=>{
   drawInkShell(c);
   for(const f of furnishings[name]){c.fillStyle='#101b2048';c.fillRect(f.x+2,f.y+f.h-1,f.w,4);blit(c,assets[interiorAsset(f.type)],f)}
  }));
 }
 return {
  setLayout(scene){layout=scene.map(p=>({...p}));if(loaded)rebuild();else void load()},
  setRoom(value){if(value!==room){room=value;sync()}},
  get active(){return room!=='inn'&&room!=='generated'&&loaded&&enabled},
  get ready(){return load()},
  draw(c,currentRoom){if(!loaded||!enabled||currentRoom==='inn')return false;const image=cache.get(currentRoom||'outside');if(!image)return false;c.drawImage(image,0,0,800,600);return true}
 };
}
