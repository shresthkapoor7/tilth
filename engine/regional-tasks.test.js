import test from 'node:test';
import assert from 'node:assert/strict';
import {GameRuntime} from './runtime.js';
import {regionLife,regionProgress,regionalTasks,regionalReady,offerRegionalQuest,acceptRegionalQuest,completeRegionalObjective} from './region-life.js';
import {interactRegionalTask,regionalObstacles} from './regional-tasks.js';
import {regionGrid,standInRegion} from './regions.js';
import {setRegionTerrain,setTaskObstacles,canStand} from '../world.js';
const content=()=>({name:'Wayside',seed:71,layout:'grove',theme:'forest',patches:[],landmarks:[{x:10,y:7,name:'Arch'},{x:20,y:13,name:'Shrine'},{x:30,y:21,name:'Camp'}],houses:[{name:'Refuge',resident:'Mara',kind:'home'},{name:'Inn',resident:'Finn',kind:'inn'}],objective:{title:'Help the village',description:'A road and a delivery',tasks:[{kind:'push_rock',label:'Boulder',landmarkIndex:0,recipientIndex:0},{kind:'clear_debris',label:'Branches',landmarkIndex:1,recipientIndex:0},{kind:'delivery',label:'Medicine',landmarkIndex:2,recipientIndex:1}]}});
function setup(){const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},g=new GameRuntime({storage});g.state.regions={'1,0':{content:content(),events:[]}};return{g,storage,entry:g.state.regions['1,0']}}
test('errands require acceptance, proximity, collection and the correct recipient; reward once',()=>{
 const {g,storage,entry}=setup(),tasks=regionalTasks(entry.content);
 assert.equal(interactRegionalTask(g,'1,0',tasks[0]),null);offerRegionalQuest(g,'1,0');acceptRegionalQuest(g,'1,0');
 assert.equal(interactRegionalTask(g,'1,0',{x:400,y:400}),null);
 for(const t of tasks.slice(0,2)){assert.ok(interactRegionalTask(g,'1,0',t));assert.equal(interactRegionalTask(g,'1,0',t),null)}
 assert.equal(interactRegionalTask(g,'1,0',{x:510,y:280},'house-1'),null);
 assert.ok(interactRegionalTask(g,'1,0',tasks[2]));assert.equal(regionalReady(entry),false);
 assert.equal(interactRegionalTask(g,'1,0',{x:510,y:280},'house-0'),null);
 assert.equal(interactRegionalTask(g,'1,0',{x:400,y:397},'house-1'),null);
 const restored=new GameRuntime({storage});assert.deepEqual(regionProgress(restored.state.regions['1,0']).carrying,['task-2']);
 assert.ok(interactRegionalTask(restored,'1,0',{x:510,y:280},'house-1'));assert.ok(regionalReady(restored.state.regions['1,0']));
 assert.ok(completeRegionalObjective(restored,'1,0'));assert.equal(completeRegionalObjective(restored,'1,0'),false);assert.equal(restored.state.jobs.filter(j=>j.kind==='awakening').length,1);
 assert.deepEqual(restored.state.events.filter(e=>['rock_moved','debris_cleared','parcel_delivered'].includes(e.type)).map(e=>e.type),['rock_moved','debris_cleared','parcel_delivered']);
});
test('task objects have reachable approaches and clearing removes collision',()=>{
 for(const layout of ['grove','river','caldera','archipelago','ruins']){
  const {g,entry}=setup();entry.content.layout=layout;const grid=regionGrid(entry.content);setRegionTerrain(grid);setTaskObstacles(regionalObstacles(entry));
  try{const q=[[20,16]],seen=new Set(['20,16']);for(const [x,y] of q)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!seen.has(k)&&canStand(nx*20+10,ny*20)){seen.add(k);q.push([nx,ny])}}
   for(const t of regionalTasks(entry.content))assert.ok(q.some(([x,y])=>Math.hypot(x*20+10-t.x,y*20-t.y)<=42),`${layout} ${t.kind} reachable`);
   const t=regionalTasks(entry.content)[0];assert.equal(canStand(t.x,t.y),false);offerRegionalQuest(g,'1,0');acceptRegionalQuest(g,'1,0');interactRegionalTask(g,'1,0',{x:t.x,y:t.y+30});setTaskObstacles(regionalObstacles(entry));assert.ok(canStand(t.x,t.y));
  }finally{setTaskObstacles([]);setRegionTerrain(null)}
 }
});
test('current region contracts reject broken destinations and unsupported punishments',async()=>{
 const {validateContent}=await import('./contracts.js');
 const c={...content(),accent:'#abcdef',description:'A village',witchLine:'Your help is remembered.',verdict:'welcoming',sourceEventIds:[],enemyCount:3,enemies:Array.from({length:3},()=>({name:'Patrol',kind:'raider',hp:60,color:'#aabbcc',taunt:'Leave!'})),houses:content().houses.map(h=>({...h,greeting:'Hello',request:'Help us',thanks:'Thanks'})),landmarks:content().landmarks.map(m=>({...m,kind:'shrine'})),patches:Array.from({length:6},(_,i)=>({kind:'trees',x:2+i*4,y:2,w:2,h:2})),consequence:{kind:'none',explanation:'Safe roads'},objective:{...content().objective,tasks:content().objective.tasks.map(t=>({...t,description:'Help with this task'}))}};
 assert.doesNotThrow(()=>validateContent('region',c,[]));
 const broken=structuredClone(c);broken.objective.tasks[0].recipientIndex=2;assert.throws(()=>validateContent('region',broken,[]));
 const hostile=structuredClone(c);hostile.verdict='hostile';hostile.consequence.kind='ember_trail';hostile.sourceEventIds=['hit'];assert.throws(()=>validateContent('region',hostile,[]));assert.doesNotThrow(()=>validateContent('region',hostile,[{id:'hit',type:'combat_hit',target:'clover'}]));
 const overlap=structuredClone(c);overlap.objective.tasks[1].landmarkIndex=0;assert.throws(()=>validateContent('region',overlap,[]));
});
