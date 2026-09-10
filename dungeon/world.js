import {regionGrid,standInRegion} from '../engine/regions.js';
import {regionLife} from '../engine/region-life.js';
export function sceneTerrain(scene){
 return {name:scene.title,theme:scene.theme,layout:scene.layout,seed:scene.seed,accent:scene.theme==='volcanic'?'#e9ab65':'#bbcda0',houses:[],patches:[],landmarks:scene.landmarks.map((m,i)=>({...m,...[{x:10,y:8},{x:30,y:10},{x:22,y:23}][i]})),enemies:scene.enemies.map(e=>({...e,kind:'raider'}))};
}
export function buildScene(scene,partySize){
 const terrain=sceneTerrain(scene),grid=regionGrid(terrain),spots=regionLife(terrain).enemies;
 const creatures=scene.enemies.map((e,i)=>({...e,id:`enemy-${i}`,x:spots[i].x*20+10,y:spots[i].y*20,maxHp:(e.kind==='dragon'?38:e.kind==='slime'?14:20)+partySize*5,hp:(e.kind==='dragon'?38:e.kind==='slime'?14:20)+partySize*5,armor:e.kind==='dragon'?14:11}));
 const props=terrain.landmarks.map((m,i)=>({...m,id:`relic-${i}`,x:m.x*20+10,y:m.y*20,secured:false}));
 return {scene:{...scene,creatures,props},grid};
}
export function nearestOpen(grid,point,occupied=[]){
 let best=null,score=Infinity;for(let y=2;y<28;y++)for(let x=2;x<38;x++){const p={x:x*20+10,y:y*20},d=Math.hypot(p.x-point.x,p.y-point.y);if(d<score&&standInRegion(grid,p.x,p.y)&&!occupied.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<25)){score=d;best=p}}return best||{x:410,y:320};
}
export function moveInScene(grid,from,to,maxDistance=80){
 const dx=to.x-from.x,dy=to.y-from.y,d=Math.hypot(dx,dy);if(!Number.isFinite(d)||d>maxDistance||d<1)return null;
 for(let i=1;i<=Math.ceil(d);i++){const t=i/Math.ceil(d);if(!standInRegion(grid,from.x+dx*t,from.y+dy*t))return null}
 return {x:Math.round(to.x),y:Math.round(to.y)};
}
export function inRange(a,b,range){return Math.hypot(a.x-b.x,a.y-b.y)<=range}
// Follow connected walkable tiles instead of oscillating against a wall.
export function pursuitStep(grid,from,target){
 const sx=Math.floor(from.x/20),sy=Math.round(from.y/20),start=sy*40+sx,queue=[[sx,sy]],seen=new Set([start]),parents=new Map();let end=null;
 for(const [x,y] of queue){const point={x:x*20+10,y:y*20};if(Math.hypot(point.x-target.x,point.y-target.y)<75){end=y*40+x;break}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=ny*40+nx;if(nx<1||nx>38||ny<2||ny>27||seen.has(key)||!standInRegion(grid,nx*20+10,ny*20))continue;seen.add(key);parents.set(key,y*40+x);queue.push([nx,ny])}}
 if(end===null||end===start)return null;let step=end;while(parents.get(step)!==start&&parents.has(step))step=parents.get(step);return moveInScene(grid,from,{x:(step%40)*20+10,y:Math.floor(step/40)*20},45);
}
