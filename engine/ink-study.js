import {furnishings} from '../world.js';
import {attackPose} from './attack-pose.js';
import {drawHeldWeapon,drawWeaponAction} from './weapon-renderer.js';
import {drawSwing} from '../combat-visuals.js';

// Presentation only. Physical footprints and room transitions remain in Tilth.
export function furniturePlacement(f){const lift={bed:23,table:28,chest:14}[f.type]||0;return{x:f.x,y:f.y-lift,w:f.w,h:f.h+lift,depth:f.y+f.h}}
export function orderedInterior(room,playerY){return [...furnishings[room].map((f,i)=>({kind:'prop',index:i,depth:furniturePlacement(f).depth})),{kind:'player',depth:playerY+13}].sort((a,b)=>a.depth-b.depth)}
export function studyMovement(directions,dt){const x=Number(directions.has('right'))-Number(directions.has('left')),y=Number(directions.has('down'))-Number(directions.has('up'));const length=Math.hypot(x,y)||1,step=Math.min(50,Math.max(0,dt))*.145;return{x:x/length*step,y:y/length*step}}
export function walkFrame(distance,moving,turnRemaining=0,reduced=false){return reduced?7:turnRemaining>55?6:turnRemaining>0?7:moving?Math.floor(distance/8)%6:7}
function cropAlpha(image,sx=0,sy=0,sw=image.width,sh=image.height){
 const scan=document.createElement('canvas');scan.width=Math.ceil(sw);scan.height=Math.ceil(sh);const c=scan.getContext('2d',{willReadFrequently:true});c.drawImage(image,sx,sy,sw,sh,0,0,scan.width,scan.height);
 const data=c.getImageData(0,0,scan.width,scan.height).data;let left=scan.width,top=scan.height,right=-1,bottom=-1,transparent=0;
 for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++){const a=data[(y*scan.width+x)*4+3];if(a<8)transparent++;if(a>160){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
 if(right<left||transparent<scan.width*scan.height*.01)throw new Error('A study image is missing a transparent background.');return{sx:sx+left,sy:sy+top,sw:right-left+1,sh:bottom-top+1};
}
function blit(c,asset,x,y,w,h,crop=asset.crop){c.drawImage(asset.image,crop.sx,crop.sy,crop.sw,crop.sh,x,y,w,h)}
function stroke(c,points,color='#332756',width=1.4){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}

export function createInkStudy({onChange,onEnter}){
 const assets={},state={enabled:true,avatar:true,loaded:false,error:null,room:null};let lastPosition=null,distance=0,lastFacing='down',turnUntil=0,readyPromise;
 const panel=document.createElement('section');panel.id='inkStudy';panel.hidden=true;panel.setAttribute('aria-label','Art study controls');
 panel.innerHTML='<div class="study-heading"><span>THE EMBER REST</span><b>A room in ink</b></div><div class="study-switches"><button id="inkMode" aria-pressed="true">Ink</button><button id="pixelMode" aria-pressed="false">Pixel</button><button id="studyAvatar" aria-pressed="true">Drawn avatar</button></div><p id="studyNote"></p>';document.body.append(panel);
 const launch=document.createElement('button');launch.id='openInkStudy';launch.textContent='✎ Art study';launch.setAttribute('aria-label','Visit the illustrated inn');document.body.append(launch);launch.onclick=()=>{void load().then(()=>onEnter())};
 function sync(){
  panel.hidden=state.room!=='inn';launch.hidden=state.room==='inn';document.body.classList.toggle('art-study-room',state.room==='inn');document.body.classList.toggle('ink-presentation',state.room==='inn'&&state.enabled&&state.loaded);
  panel.querySelector('#inkMode').setAttribute('aria-pressed',String(state.enabled));panel.querySelector('#pixelMode').setAttribute('aria-pressed',String(!state.enabled));
  const avatar=panel.querySelector('#studyAvatar');avatar.setAttribute('aria-pressed',String(state.avatar));avatar.textContent=state.avatar?'Drawn avatar':'Saved avatar';avatar.hidden=!state.enabled;
  panel.querySelector('#studyNote').textContent=state.error||(!state.enabled?'Original pixel art. Switch to Ink to compare.':!state.loaded?'Loading the prepared drawings…':state.avatar?'Character art study · one outfit. Your saved character and weapon are retained.':'Your saved character, in the same room.');
 }
 panel.querySelector('#inkMode').onclick=()=>{state.enabled=true;sync();onChange();document.querySelector('#world').focus()};
 panel.querySelector('#pixelMode').onclick=()=>{state.enabled=false;sync();onChange();document.querySelector('#world').focus()};
 panel.querySelector('#studyAvatar').onclick=()=>{state.avatar=!state.avatar;sync();onChange();document.querySelector('#world').focus()};
 const manifest={bed:'bed-front',table:'desk-front',chest:'cupboard-front',portrait:'player-portrait',...Object.fromEntries(['up','down','left','right'].map(d=>[d,'walk-front-'+d]))};
 function load(){
  if(readyPromise)return readyPromise;launch.disabled=true;launch.textContent='Loading art…';
  readyPromise=Promise.all(Object.entries(manifest).map(async([key,file])=>{const image=new Image();image.src='/art/study/'+file+'.png';await image.decode();const asset={image,crop:cropAlpha(image)};
   if(['up','down','left','right'].includes(key)){const w=image.width/4,h=image.height/2;asset.frames=Array.from({length:8},(_,i)=>cropAlpha(image,(i%4)*w,Math.floor(i/4)*h,w,h))}assets[key]=asset;
  })).then(()=>{state.loaded=true;launch.disabled=false;launch.textContent='✎ Art study';sync();onChange();return true}).catch(()=>{state.error='The drawings could not load. Pixel mode is still available.';state.enabled=false;launch.disabled=false;launch.textContent='✎ Art study';sync();onChange();return false});return readyPromise;
 }
 const background=document.createElement('canvas');background.width=1600;background.height=1200;const b=background.getContext('2d');b.scale(2,2);
 b.fillStyle='#f4f0e6';b.fillRect(0,0,800,600);b.fillStyle='#e1d9ed';b.fillRect(196,103,408,57);b.fillStyle='#faf6ed';b.fillRect(214,160,372,292);b.fillStyle='#cec4df';b.fillRect(196,160,18,292);b.fillRect(586,160,18,292);
 stroke(b,[[197,451],[196,103],[604,104],[603,452],[422,453]],'#332756',2);stroke(b,[[196,452],[381,452]],'#332756',2);stroke(b,[[215,451],[214,160],[585,160],[586,451]],'#58436f',1.4);
 stroke(b,[[196,103],[214,118],[214,160]],'#79668f',.7);stroke(b,[[604,104],[586,118],[586,160]],'#79668f',.7);
 // Quiet planes and sparse construction marks; texture lives in the real drawings.
 for(let i=0;i<9;i++)stroke(b,[[222+i*41,143+(i%3)*3],[230+i*41,144+(i%3)*3]],'#bdb0cd',.6);
 b.fillStyle='#dab2a9';b.fillRect(329,258,145,138);b.strokeStyle='#a97883';b.lineWidth=1;b.strokeRect(329,258,145,138);b.strokeStyle='#f4dcd0';b.lineWidth=2;b.strokeRect(334,263,135,128);
 b.fillStyle='#e2c493';b.fillRect(382,421,39,33);stroke(b,[[382,421],[421,421],[421,453]],'#8e6d66',1);stroke(b,[[394,437],[400,443],[406,437]],'#735369',1.5);b.fillStyle='#8c7387';b.font='7px Georgia';b.textAlign='center';b.fillText('CINDERWATCH',400,132);
 function portrait(c){if(!state.loaded||!state.enabled||!state.avatar||state.room!=='inn')return false;c.clearRect(0,0,c.canvas.width,c.canvas.height);blit(c,assets.portrait,6,3,108,114);return true}
 function drawPlayer(c,{x,y,facing,moving,time,attack,kind,weapon,reduced}){
  if(lastPosition)distance+=Math.min(20,Math.hypot(x-lastPosition.x,y-lastPosition.y));lastPosition={x,y};if(lastFacing!==facing){turnUntil=time+110;lastFacing=facing}
  const frame=walkFrame(distance,moving,turnUntil-time,reduced),asset=assets[facing]||assets.down,crop=asset.frames[frame];const pose=attackPose(attack,weapon,kind,facing),attacking=Number.isFinite(attack)&&attack>=0&&attack<1;
  c.save();c.translate(x,y+13);c.fillStyle='#64517420';c.beginPath();c.ellipse(0,0,10,2.4,0,0,Math.PI*2);c.fill();c.translate(pose.x,pose.y);c.rotate(pose.tilt);
  if(attacking&&kind==='Dodge'&&!reduced){c.translate(0,-20);c.rotate(attack*Math.PI*2);c.translate(0,20)}
  const height=62,width=height*crop.sw/crop.sh;blit(c,asset,-width/2,-height,width,height,crop);c.translate(0,-13);c.scale(1.05,1.05);if(facing==='left')c.scale(-1,1);
  if(attacking){if(!drawWeaponAction(c,attack,facing,weapon,kind))drawSwing(c,attack,facing,false,kind)}else if(!drawHeldWeapon(c,weapon)){stroke(c,[[12,4],[19,-21]],'#352b56',3);stroke(c,[[12,4],[19,-21]],'#bcafb7',1.5);stroke(c,[[9,4],[16,6]],'#a88256',2)}c.restore();
 }
 return {get ready(){return load()},get active(){return state.room==='inn'&&state.enabled&&state.loaded},get drawnAvatar(){return state.avatar&&state.loaded},
  setRoom(room){if(room!==state.room){state.room=room;lastPosition=null;if(room==='inn')void load();sync()}},portrait,
  drawRoom(c,player,drawOriginalPlayer,drawAttachments){c.drawImage(background,0,0,800,600);for(const item of orderedInterior('inn',player.y)){if(item.kind==='player'){if(state.avatar){drawAttachments();drawPlayer(c,player)}else drawOriginalPlayer();continue}const f=furnishings.inn[item.index],p=furniturePlacement(f);blit(c,assets[f.type],p.x,p.y,p.w,p.h)}}
 };
}
