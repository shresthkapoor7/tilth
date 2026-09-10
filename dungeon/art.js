import {drawHero} from '../volcanic.js';
import {characterContent} from '../content/characters.js';
import {drawScenery,drawWilderness} from './scenery.js';
import {regionGrid} from '../engine/regions.js';
import {sceneTerrain} from './world.js';
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)};
const poly=(c,points,col)=>{c.fillStyle=col;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()};
function text(c,s,x,y,col='#eee0ba',size=14){c.font=`${size}px VT323,monospace`;c.textAlign='center';c.fillStyle='#102224';c.fillText(s,x+1,y+1);c.fillStyle=col;c.fillText(s,x,y)}
export function creature(c,e,now,attack=0){
 const t=now/1000,x=e.x,y=e.y;c.save();c.translate(Math.round(x),Math.round(y));
 if(e.hp<=0){rect(c,-13,5,26,5,'#253833');text(c,e.name,0,30,'#869988',12);c.restore();return}
 const bob=Math.round(Math.sin(t*2+(e.id?.length||0))*2);c.translate(0,bob);const col=e.color||'#a36d47';
 c.fillStyle='#08191880';c.beginPath();c.ellipse(0,15,e.kind==='dragon'?45:19,7,0,0,Math.PI*2);c.fill();
 if(e.kind==='dragon'){
  const flap=Math.round(Math.sin(t*3)*9);for(const side of [-1,1]){c.save();c.scale(side,1);poly(c,[[6,-30],[27,-64-flap],[58,-47-flap],[49,-19],[33,-27],[18,-12]],'#162b2c');poly(c,[[9,-29],[28,-58-flap],[52,-45-flap],[44,-24],[31,-32],[18,-18]],col);poly(c,[[12,-26],[28,-54-flap],[29,-31],[45,-28],[31,-35]],'#d69863');c.restore()}
  poly(c,[[-18,8],[-36,3],[-51,-11],[-46,10],[-22,19],[4,18]],col);rect(c,-21,-23,42,34,'#162b29');rect(c,-18,-24,36,31,col);rect(c,-11,-16,23,24,'#d2a565');rect(c,-24,7,14,12,col);rect(c,13,7,15,12,col);rect(c,-24,16,17,4,'#ddd3ad');rect(c,13,16,17,4,'#ddd3ad');
  rect(c,-15,-46,31,28,'#162c2b');rect(c,-12,-46,27,25,col);rect(c,-18,-31,38,14,col);rect(c,-15,-21,31,5,'#172424');rect(c,-11,-23,4,7,'#ebe0b7');rect(c,8,-23,4,7,'#ebe0b7');rect(c,-9,-38,6,5,'#f4cf72');rect(c,7,-38,6,5,'#f4cf72');rect(c,-7,-38,2,5,'#14211f');rect(c,9,-38,2,5,'#14211f');poly(c,[[-13,-44],[-20,-57],[-7,-48]],'#e2cca0');poly(c,[[9,-46],[20,-58],[16,-41]],'#e2cca0');for(let i=0;i<4;i++)rect(c,-2,-20+i*7,4,3,'#8a693e');
 }else if(e.kind==='slime'){
  const squash=Math.round(Math.sin(t*4)*3);poly(c,[[-22,10],[-19,-7+squash],[-10,-20+squash],[6,-22+squash],[20,-9+squash],[24,12]],'#182e2b');poly(c,[[-19,9],[-16,-6+squash],[-8,-17+squash],[5,-19+squash],[17,-7+squash],[20,10]],col);rect(c,-11,-10+squash,9,3,'#cfe4ba');rect(c,-8,-2,4,5,'#172923');rect(c,7,-2,4,5,'#172923');rect(c,-2,7,6,2,'#20342e');
 }else if(e.kind==='skeleton'){
  rect(c,-9,-35,19,16,'#d8d8b5');rect(c,-11,-31,22,10,'#c4cdb2');rect(c,-6,-29,5,5,'#172625');rect(c,4,-29,5,5,'#172625');rect(c,-3,-18,6,19,'#cccdb1');for(let i=0;i<3;i++)rect(c,-10,-16+i*5,20,2,'#dce0bb');rect(c,-8,2,4,15,'#d4d6b8');rect(c,5,2,4,15,'#d4d6b8');rect(c,-15,-14,4,17,'#b9c6ac');rect(c,13,-15,4,16,'#b9c6ac');rect(c,18,-20,3,30,'#a9bbc1');rect(c,14,7,11,3,'#b69359');rect(c,-8,-35,19,4,col);
 }else{
  rect(c,-12,-25,25,17,col);poly(c,[[-9,-22],[-25,-29],[-16,-11]],col);poly(c,[[9,-22],[25,-29],[15,-11]],col);rect(c,-7,-20,4,4,'#eddb99');rect(c,5,-20,4,4,'#eddb99');rect(c,-7,-8,16,18,'#594b38');rect(c,-8,-7,18,5,'#a08346');rect(c,-9,10,6,9,col);rect(c,5,10,6,9,col);rect(c,14,-5,3,21,'#918560');poly(c,[[14,-6],[14,-21],[20,-17],[17,-6]],'#c8d2bb');
 }
 c.restore();const top=e.kind==='dragon'?y-77:y-44;text(c,e.name,x,top,'#f3dca7');rect(c,x-20,y+23,40,4,'#102226');rect(c,x-19,y+24,38*e.hp/e.maxHp,2,'#d58555');
}
export function hero(c,p,now,active,effect){
 const elapsed=effect?(now-effect.localTime)/700:2,attacking=elapsed>=0&&elapsed<1;
 if(active){c.strokeStyle='#e5c37c';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+13,21,7,0,0,Math.PI*2);c.stroke()}
 if(p.hp<=0)c.globalAlpha=.35;
 drawHero(c,p.x,p.y,p.color,1.3,'',false,{role:p.heroClass,walking:p.walking,direction:effect&&effect.to.x<p.x?'left':'right',custom:{...characterContent({heroClass:p.heroClass}),weapon:p.weapon,outfitColor:p.color,clothing:p.heroClass==='Mage'||p.heroClass==='Healer'?'Robe':'Coat'},kind:effect?.kind==='heal'?'Spin':'Heavy',attack:attacking?elapsed:undefined});c.globalAlpha=1;text(c,p.name,p.x,p.y-43,active?'#ffdc8d':'#d4dbc2');if(p.guard)text(c,'▣',p.x+25,p.y,'#8fced2',21);
}
export function background(scene){const c=document.createElement('canvas');c.width=1600;c.height=1400;const ctx=c.getContext('2d');ctx.translate(400,400);drawWilderness(ctx,scene.theme,scene.seed);const terrain=sceneTerrain(scene);c.layers=drawScenery(ctx,terrain,regionGrid(terrain));return c;}
export function effect(c,e,now,reduced){const t=(now-e.localTime)/900;if(t<0||t>1)return;const {from,to}=e;c.save();c.globalAlpha=1-t;
 if(e.kind==='fire'){
  for(let i=0;i<18;i++){const progress=i/18,x=from.x+(to.x-from.x)*progress,y=from.y+(to.y-from.y)*progress;rect(c,x+Math.sin(i*3+now/80)*progress*17,y-15+Math.cos(i*2)*progress*15,7+progress*9,5+progress*7,i%2?'#f0b556':'#d76836')}
 }else if(e.kind==='attack'){c.strokeStyle='#f4d4a0';c.lineWidth=3;c.beginPath();c.moveTo(from.x,from.y-12);c.lineTo(to.x,to.y-12);c.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;rect(c,to.x+Math.cos(a)*t*28,to.y-10+Math.sin(a)*t*28,3,3,'#e8ad61')}}
 else {c.strokeStyle=e.kind==='heal'?'#94d4bb':'#e5cc89';c.lineWidth=2;c.beginPath();c.ellipse(to.x,to.y,15+t*24,8+t*14,0,0,Math.PI*2);c.stroke()}
 text(c,e.kind==='miss'?'MISS':e.amount?`${e.kind==='heal'?'+':'−'}${e.amount}`:'✦',to.x,to.y-30-(reduced?0:t*30),e.kind==='heal'?'#a6e6be':'#ffe0a5',22);c.restore();}

export function resident(c,n,quests,now){
 const i=Number(n.id.split('-').at(-1))||0;
 drawHero(c,n.x,n.y,n.color,1.35,'',false,{unarmed:true,direction:'down',role:'Healer',custom:{...characterContent({heroClass:'Healer'}),outfitColor:n.color,clothing:i===1?'Robe':'Tunic',hairStyle:['Swept','Braid','Curls'][i%3],hairColor:['#aa9472','#6c4831','#bbc1a6'][i%3]}});
 text(c,n.name,n.x,n.y-43,'#f2deb0',13);
 const ready=quests.some(q=>(q.giverId===n.id&&q.status==='ready')||(q.recipientId===n.id&&q.kind==='delivery'&&q.status==='active'));
 const offered=quests.some(q=>q.giverId===n.id&&q.status==='offered');
 if(ready||offered)text(c,ready?'?':'!',n.x,n.y-59,ready?'#bbd58d':'#f1c871',20);
}
