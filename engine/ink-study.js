import {furnishings} from '../world.js';
import {attackPose} from './attack-pose.js';
import {drawHeldWeapon,drawWeaponAction} from './weapon-renderer.js';
import {drawSwing} from '../combat-visuals.js';
import {drawHero} from '../volcanic.js';

// Presentation only. Physical footprints and room transitions remain in Tilth.
export function furniturePlacement(f){return{x:f.x,y:f.y,w:f.w,h:f.h,depth:f.y+f.h}}
export function supportsInkAvatar(profile){return Object.entries({hairStyle:'Swept',hairColor:'#705039',skinColor:'#e4b47e',clothing:'Coat',outfitColor:'#a85b37'}).every(([key,value])=>profile?.[key]===value)}
export function selectsInkAvatar(profile,selection='auto'){return selection==='drawn'||(selection==='auto'&&supportsInkAvatar(profile))}
export function orderedInterior(room,playerY){return [...furnishings[room].map((f,i)=>({kind:'prop',index:i,depth:furniturePlacement(f).depth})),{kind:'player',depth:playerY+13}].sort((a,b)=>a.depth-b.depth)}
export function studyMovement(directions,dt){const x=Number(directions.has('right'))-Number(directions.has('left')),y=Number(directions.has('down'))-Number(directions.has('up'));const length=Math.hypot(x,y)||1,step=Math.min(50,Math.max(0,dt))*.145;return{x:x/length*step,y:y/length*step}}
export function walkFrame(distance,moving,turnRemaining=0,reduced=false){return reduced?7:turnRemaining>55?6:turnRemaining>0?7:moving?Math.floor(distance/8)%6:7}
export function cropAlpha(image,sx=0,sy=0,sw=image.width,sh=image.height){
 const scan=document.createElement('canvas');scan.width=Math.ceil(sw);scan.height=Math.ceil(sh);const c=scan.getContext('2d',{willReadFrequently:true});c.drawImage(image,sx,sy,sw,sh,0,0,scan.width,scan.height);
 const data=c.getImageData(0,0,scan.width,scan.height).data;let left=scan.width,top=scan.height,right=-1,bottom=-1,transparent=0;
 for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++){const a=data[(y*scan.width+x)*4+3];if(a<8)transparent++;if(a>160){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
 if(right<left||transparent<scan.width*scan.height*.01)throw new Error('A study image is missing a transparent background.');return{sx:sx+left,sy:sy+top,sw:right-left+1,sh:bottom-top+1};
}
function blit(c,asset,x,y,w,h,crop=asset.crop){c.drawImage(asset.image,crop.sx,crop.sy,crop.sw,crop.sh,x,y,w,h)}
function stroke(c,points,color='#252d28',width=1.4){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}

// Same construction and palette as interiors.js; linework is cached once.
export function drawInkShell(b){
 const rect=(x,y,w,h,color)=>{b.fillStyle=color;b.fillRect(x,y,w,h)};
 rect(0,0,800,600,'#111c20');rect(211,149,379,303,'#594934');
 b.save();b.beginPath();b.rect(211,149,379,303);b.clip();
 for(let y=149;y<452;y+=13)for(let x=211;x<590;x+=32){
  rect(x,y,32,13,(x+y)%3?'#65513b':'#594934');
  stroke(b,[[x,y+12.5],[x+13,y+12.2],[x+32,y+12.6]],'#392f27',.65);
  stroke(b,[[x+31.6,y],[x+31.3,y+6],[x+31.6,y+13]],'#483e2f',.65);
  stroke(b,[[x+1,y+1],[x+15,y+1.3],[x+30,y+1]],'#87704d',.55);
  stroke(b,[[x+5,y+7],[x+13,y+6.5],[x+23,y+7]],'#483e2f',.4);
 }
 b.restore();rect(196,103,408,57,'#263133');
 for(let y=107;y<157;y+=12)for(let x=200;x<601;x+=25){
  rect(x,y,23,10,'#454b43');stroke(b,[[x+.5,y+.8],[x+11,y+.4],[x+22,y+1]],'#74745c',.6);
  stroke(b,[[x+3,y+7],[x+9,y+5],[x+13,y+5.8]],'#353d36',.6);
 }
 rect(196,158,18,294,'#42473b');rect(586,158,18,294,'#343e36');
 rect(196,452,185,13,'#706346');rect(422,452,182,13,'#706346');
 rect(199,160,5,290,'#998157');rect(589,160,4,290,'#706747');
 stroke(b,[[196,452],[196.5,103],[604,103.4],[603.5,452]],'#172326',1.8);
 stroke(b,[[214,450],[213.5,160],[586,159.7],[586,452]],'#1f2b28',1.2);
 rect(374,421,53,40,'#8e7046');rect(380,427,41,34,'#c19856');rect(383,430,35,27,'#564c36');
 rect(323,233,151,167,'#563b32');rect(327,237,143,159,'#a1784b');rect(330,240,137,153,'#684437');
 stroke(b,[[323,400],[323.4,233],[474,233.4],[473.7,400],[323,400]],'#312b25',.9);
 for(let y=248;y<388;y+=12)for(const x of [335.5,466.5])stroke(b,[[x,y],[x-.4,y+5]],'#c5a06a',1.6);
 for(let y=245;y<394;y+=5)stroke(b,[[332,y],[397,y+.3],[465,y]],'#a1784b20',.35);
 for(const x of [259,529]){
  rect(x,119,12,28,'#342a22');stroke(b,[[x+2,144],[x+10,144]],'#a1784b',1);
  rect(x+3,123,6,13,'#b7ab83');b.fillStyle='#e58b39';b.beginPath();b.moveTo(x+6,112);b.quadraticCurveTo(x+13,123,x+6,128);b.quadraticCurveTo(x,124,x+6,112);b.fill();
  stroke(b,[[x+6,117],[x+5,125]],'#ffdda0',2);
  const glow=b.createRadialGradient(x+6,124,1,x+6,124,78);glow.addColorStop(0,'#ffc47430');glow.addColorStop(1,'#e7792100');b.fillStyle=glow;b.fillRect(x-72,46,156,156);
 }
 stroke(b,[[395,443],[400,448],[405,443]],'#e2cb94',1.2);
}

export function createInkStudy({onChange,onEnter,getProfile}){
 const assets={},state={enabled:true,avatar:'auto',loaded:false,error:null,room:null};let lastPosition=null,distance=0,lastFacing='down',turnUntil=0,readyPromise;
 const panel=document.createElement('section');panel.id='inkStudy';panel.hidden=true;panel.setAttribute('aria-label','Art study controls');
 panel.innerHTML='<div class="study-heading"><span>THE EMBER REST</span><b>A room in ink</b></div><div class="study-switches"><button id="inkMode" aria-pressed="true">Ink room</button><button id="pixelMode" aria-pressed="false">Pixel room</button></div><div class="study-avatar"><canvas id="studyAvatarPreview" width="200" height="240" role="img" aria-label="Enlarged character preview"></canvas><div class="study-switches" role="group" aria-label="Character appearance"><button id="studyAvatar" aria-pressed="true">Drawn character</button><button id="studyPixelAvatar" aria-pressed="false">Pixel character</button></div></div><p id="studyNote"></p>';document.body.append(panel);
 const launch=document.createElement('button');launch.id='openInkStudy';launch.textContent='✎ Art study';launch.setAttribute('aria-label','Visit the illustrated inn');document.body.append(launch);launch.onclick=()=>{void load().then(()=>onEnter())};
 function sync(){
  panel.hidden=state.room!=='inn';launch.hidden=state.room==='inn';document.body.classList.toggle('art-study-room',state.room==='inn');document.body.classList.toggle('ink-presentation',state.room==='inn'&&state.enabled&&state.loaded);
  panel.querySelector('#inkMode').setAttribute('aria-pressed',String(state.enabled));panel.querySelector('#pixelMode').setAttribute('aria-pressed',String(!state.enabled));
  const profile=getProfile(),supported=supportsInkAvatar(profile),drawn=state.enabled&&state.loaded&&selectsInkAvatar(profile,state.avatar),avatar=panel.querySelector('#studyAvatar');avatar.setAttribute('aria-pressed',String(drawn));avatar.disabled=!state.loaded;
  panel.querySelector('#studyPixelAvatar').setAttribute('aria-pressed',String(!drawn));
  panel.querySelector('#studyNote').textContent=state.error||(!state.loaded?'Loading the prepared drawings…':drawn&&!supported?'Drawn sample: brown hair and copper coat. Your saved appearance is unchanged.':drawn?'Your character in ink. Walking and weapons work in the room.':!supported?'Your saved appearance. Drawn character previews the prepared brown-haired, copper-coat sample.':'Your saved pixel character. Choose Drawn character to compare.');
  drawAvatarPreview(profile,drawn);
 }
 panel.querySelector('#inkMode').onclick=()=>{state.enabled=true;sync();onChange();document.querySelector('#world').focus()};
 panel.querySelector('#pixelMode').onclick=()=>{state.enabled=false;sync();onChange();document.querySelector('#world').focus()};
 panel.querySelector('#studyAvatar').onclick=()=>{state.enabled=true;state.avatar='drawn';sync();onChange();document.querySelector('#world').focus()};
 panel.querySelector('#studyPixelAvatar').onclick=()=>{state.avatar='pixel';sync();onChange();document.querySelector('#world').focus()};
 const manifest={bed:'tilth-bed-v2',table:'tilth-table-v2',chest:'tilth-chest-v2',ember:'tilth-ember-v2'};
 function load(){
  if(readyPromise)return readyPromise;launch.disabled=true;launch.textContent='Loading art…';
  readyPromise=Promise.all(Object.entries(manifest).map(async([key,file])=>{const image=new Image();image.src='/art/study/'+file+'.png';await image.decode();const asset={image,crop:cropAlpha(image)};
   if(key==='ember'){
    const w=image.width/8,h=image.height/4;
    for(const [row,direction] of ['down','left','up','right'].entries()){
     const frames=Array.from({length:8},(_,i)=>({...cropAlpha(image,i*w,row*h,w,h),cellX:i*w,cellY:row*h}));
     const idle=frames[7];assets[direction]={image,frames,cellWidth:w,baseline:idle.sy-row*h+idle.sh};
    }
    // One scale for the entire sheet avoids a breathing size change each step.
    asset.scale=48/assets.down.frames[7].sh;
   }assets[key]=asset;
  })).then(()=>{state.loaded=true;launch.disabled=false;launch.textContent='✎ Art study';sync();onChange();return true}).catch(()=>{state.error='The drawings could not load. Pixel mode is still available.';state.enabled=false;launch.disabled=false;launch.textContent='✎ Art study';sync();onChange();return false});return readyPromise;
 }
 const background=document.createElement('canvas');background.width=1600;background.height=1200;const b=background.getContext('2d');b.scale(2,2);
 drawInkShell(b);
 const useDrawnAvatar=()=>selectsInkAvatar(getProfile(),state.avatar);
 function drawAvatarPreview(profile,drawn){
  const canvas=panel.querySelector('#studyAvatarPreview'),c=canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,100,120);c.imageSmoothingEnabled=drawn;
  canvas.setAttribute('aria-label',drawn?'Enlarged drawn character preview':'Enlarged saved pixel character preview');
  if(drawn){const crop=assets.down.frames[7],h=98,w=h*crop.sw/crop.sh;blit(c,assets.down,50-w/2,10,w,h,crop)}
  else drawHero(c,50,76,profile.outfitColor,2.4,'',false,{custom:profile,role:profile.heroClass,direction:'down'});
 }
 function portrait(c){if(!state.loaded||!state.enabled||!useDrawnAvatar()||state.room!=='inn')return false;c.clearRect(0,0,c.canvas.width,c.canvas.height);const crop=assets.down.frames[7],upper={...crop,sh:crop.sh*.58};const scale=108/upper.sh;blit(c,assets.down,60-upper.sw*scale/2,6,upper.sw*scale,108,upper);return true}
 function drawPlayer(c,{x,y,facing,moving,time,attack,kind,weapon,reduced}){
  if(lastPosition)distance+=Math.min(20,Math.hypot(x-lastPosition.x,y-lastPosition.y));lastPosition={x,y};if(lastFacing!==facing){turnUntil=time+110;lastFacing=facing}
  const frame=walkFrame(distance,moving,turnUntil-time,reduced),asset=assets[facing]||assets.down,crop=asset.frames[frame];const pose=attackPose(attack,weapon,kind,facing),attacking=Number.isFinite(attack)&&attack>=0&&attack<1;
  c.save();c.translate(x,y+13);c.fillStyle='#08171970';c.beginPath();c.ellipse(0,0,10,2.4,0,0,Math.PI*2);c.fill();c.translate(pose.x,pose.y);c.rotate(pose.tilt);
  if(attacking&&kind==='Dodge'&&!reduced){c.translate(0,-20);c.rotate(attack*Math.PI*2);c.translate(0,20)}
  const scale=assets.ember.scale;blit(c,asset,(crop.sx-crop.cellX-asset.cellWidth/2)*scale,(crop.sy-crop.cellY-asset.baseline)*scale,crop.sw*scale,crop.sh*scale,crop);c.translate(0,-13);c.scale(1.05,1.05);if(facing==='left')c.scale(-1,1);
  if(attacking){if(!drawWeaponAction(c,attack,facing,weapon,kind))drawSwing(c,attack,facing,false,kind)}else if(!drawHeldWeapon(c,weapon)){stroke(c,[[12,4],[19,-21]],'#352b56',3);stroke(c,[[12,4],[19,-21]],'#bcafb7',1.5);stroke(c,[[9,4],[16,6]],'#a88256',2)}c.restore();
 }
 return {get ready(){return load()},get active(){return state.room==='inn'&&state.enabled&&state.loaded},get drawnAvatar(){return state.enabled&&useDrawnAvatar()&&state.loaded},refreshProfile(){state.avatar='auto';sync()},
  setRoom(room){if(room!==state.room){state.room=room;lastPosition=null;if(room==='inn')void load();sync()}},portrait,
  drawRoom(c,player,drawOriginalPlayer,drawAttachments,beforePlayer=()=>{}){c.drawImage(background,0,0,800,600);for(const item of orderedInterior('inn',player.y)){if(item.kind==='player'){beforePlayer();if(useDrawnAvatar()){drawAttachments();drawPlayer(c,player)}else drawOriginalPlayer();continue}const f=furnishings.inn[item.index],p=furniturePlacement(f);c.fillStyle='#101b2048';c.fillRect(p.x+2,p.y+p.h-1,p.w,4);blit(c,assets[f.type],p.x,p.y,p.w,p.h)}}
 };
}
