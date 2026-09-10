import test from 'node:test';
import assert from 'node:assert/strict';
import {DungeonRooms} from './dungeon-rooms.js';
import {buildScene,nearestOpen,sceneTerrain,moveInScene} from '../dungeon/world.js';
import {regionGrid,standInRegion} from '../engine/regions.js';
import {worldView} from '../dungeon/view.js';
import {journalMoves} from '../dungeon/journal.js';
const scene={title:'Willowford',narration:'Welcome to the village.',goal:'Help the people of Willowford.',theme:'forest',layout:'grove',seed:4331,enemies:[{name:'Too Early',kind:'dragon',color:'#778855'}],landmarks:[{name:'Old Well',kind:'shrine'},{name:'Lantern Grove',kind:'camp'}],residents:[{name:'Mara',home:'Herbalist House',role:'Herbalist',color:'#887755',greeting:'The village needs a hand.'},{name:'Orrin',home:'Old Smithy',role:'Smith',color:'#aa6655',greeting:'There is work to do.'},{name:'Elowen',home:'Wayfarer Inn',role:'Innkeeper',color:'#669977',greeting:'Welcome.'}],quests:[{title:'Herbs for the inn',description:'Take a parcel to the innkeeper.',kind:'delivery',giver:0,recipient:2,landmark:0,item:'Herb parcel',thanks:'The herbs arrived safely.'},{title:'Clear the well',description:'Move the fallen branches at the well.',kind:'clear',giver:1,recipient:0,landmark:0,item:'Fallen branches',thanks:'The path is clear.'}],suggestions:['Speak to Mara','Visit the old smithy']};
async function setup(){const rooms=new DungeonRooms({configured:true,async generate(kind,c){return kind==='scene'?structuredClone(scene):{kind:c.intent.kind,targetId:c.intent.targetId,difficulty:'easy',successText:'The branches are moved aside.',failureText:'The branches stay put.',suggestions:[]}}},{roll:s=>s});const a=rooms.create({name:'Ari',heroClass:'Mage',wish:'A dragon adventure'}),b=rooms.join(a.code,{name:'Bea',heroClass:'Healer'});const {r,p}=rooms.authorize(a.code,a.token);rooms.begin(r,p);await r.pending;return {rooms,r,p,other:r.players[1]}}
const near=(r,p,target)=>{const neighbor=[[20,0],[-20,0],[0,20],[0,-20]].map(([x,y])=>({x:target.x+x,y:target.y+y})).find(v=>standInRegion(r.grid,v.x,v.y)&&moveInScene(r.grid,v,target,80));Object.assign(p,neighbor||nearestOpen(r.grid,{x:target.x,y:target.y+25}))};
test('the opening is populated and peaceful even if a scene or wish includes a dragon',async()=>{
 const {rooms,r,p,other}=await setup();assert.equal(r.combat,false);assert.equal(r.scene.creatures.length,0);assert.equal(r.scene.homes.length,3);assert.equal(r.scene.residents.length,3);assert.equal(r.scene.quests.length,2);assert.deepEqual(regionGrid(sceneTerrain(r.scene)),r.grid);
 for(const n of r.scene.residents)assert.ok(standInRegion(r.grid,n.x,n.y));
 // A second player can act without waiting for initiative, after more than a combat turn's travel.
 other.moved=100;const point=nearestOpen(r.grid,{x:other.x+20,y:other.y},[other]);rooms.act(r,other,{kind:'move',...point,actionId:'guest-explore-1'});assert.equal(r.combat,false);
 assert.equal(journalMoves(rooms.snapshot(r,p),other,r.grid).find(m=>m.kind==='move').reason,'');
 assert.throws(()=>rooms.act(r,p,{kind:'end',actionId:'explore-end-1'}),/no turn/);
});
test('accepted delivery requires the correct recipient, then a return; every player sees the same progress',async()=>{
 const {rooms,r,p,other}=await setup();const q=r.scene.quests[0],giver=r.scene.residents.find(n=>n.id===q.giverId),recipient=r.scene.residents.find(n=>n.id===q.recipientId);
 near(r,p,giver);rooms.act(r,p,{kind:'accept',questId:q.id,actionId:'accept-parcel-1'});assert.equal(q.status,'active');
 assert.throws(()=>rooms.act(r,p,{kind:'deliver',questId:q.id,actionId:'wrong-place-1'}),/Move closer/);
 assert.throws(()=>rooms.act(r,p,{kind:'claim',questId:q.id,actionId:'early-claim-1'}),/Finish the task/);
 near(r,other,recipient);rooms.act(r,other,{kind:'deliver',questId:q.id,actionId:'deliver-parcel-1'});assert.equal(q.status,'ready');
 near(r,other,giver);rooms.act(r,other,{kind:'claim',questId:q.id,actionId:'claim-parcel-1'});assert.equal(q.status,'complete');assert.equal(other.journal.at(-1).intent,q.title);assert.equal(r.phase,'playing');
 const count=other.journal.length;rooms.act(r,other,{kind:'claim',questId:q.id,actionId:'claim-parcel-1'});assert.equal(other.journal.length,count);
 assert.equal(rooms.snapshot(r,p).scene.quests[0].status,'complete');
});
test('a blocked request cannot be completed before acceptance; clearing really removes the obstacle',async()=>{
 const {rooms,r,p}=await setup();const q=r.scene.quests[1],prop=r.scene.props.find(v=>v.questId===q.id),giver=r.scene.residents.find(n=>n.id===q.giverId);
 near(r,p,prop);assert.throws(()=>rooms.act(r,p,{kind:'interact',targetId:prop.id,actionId:'not-accepted-1'}),/Accept this request/);
 assert.throws(()=>rooms.act(r,p,{kind:'move',x:prop.x,y:prop.y,actionId:'blocked-debris-1'}),/debris/);
 near(r,p,giver);rooms.act(r,p,{kind:'accept',questId:q.id,actionId:'accept-clear-1'});near(r,p,prop);
 rooms.act(r,p,{kind:'interact',targetId:prop.id,actionId:'clear-branches-1'});await r.pending;assert.equal(r.error,null);assert.equal(q.status,'ready');assert.equal(prop.secured,true);assert.equal(r.combat,false);
 rooms.act(r,p,{kind:'move',x:prop.x,y:prop.y,actionId:'walk-cleared-1'});
 r.scene.quests[0].status='complete';near(r,p,giver);rooms.act(r,p,{kind:'claim',questId:q.id,actionId:'finish-clear-1'});assert.equal(r.phase,'cleared');assert.equal(r.combat,false);
});
test('later danger starts a combat turn and defeating threats returns the party to exploration',async()=>{
 const {rooms,r,p}=await setup();const later=structuredClone(scene);later.enemies[0].kind='goblin';const built=buildScene(later,2,{chapter:2});r.scene=built.scene;r.grid=built.grid;r.chapter=2;r.phase='playing';const enemy=r.scene.creatures[0];near(r,p,enemy);
 rooms.act(r,p,{kind:'attack',targetId:enemy.id,actionId:'enter-combat-1'});await r.pending;assert.equal(r.combat,true);
 enemy.hp=0;rooms.finishTurn(r);assert.equal(r.combat,false);assert.equal(r.phase,'playing');
 assert.equal(buildScene(scene,2,{chapter:2}).scene.creatures.length,0);assert.equal(buildScene(scene,2,{chapter:3}).scene.creatures[0].kind,'dragon');
});
test('the camera places the traveler in free screen space with or without action and dice panels',()=>{
 for(const [w,h] of [[1280,800],[844,390],[390,844],[360,640]])for(const panel of [false,true])for(const p of [{x:30,y:560},{x:780,y:80}]){
  const v=worldView(w,h,p,{panel,panelHeight:240});const sx=(p.x-v.x)/v.width*w,sy=(p.y-v.y)/v.height*h;
  assert.ok(sx>80&&sx<w-(panel&&w>650?300:0));assert.ok(sy>110&&sy<h-100);
  if(w<=650&&panel)assert.ok(sy<h-340);
 }
});
test('settlements keep every resident and task reachable across themes and terrain layouts',()=>{
 for(const theme of ['forest','marsh','frost','volcanic'])for(const layout of ['grove','ruins','river','caldera','archipelago']){
  const {scene:world,grid}=buildScene({...structuredClone(scene),theme,layout,enemies:[]},4);
  const start=world.residents[0],queue=[start],seen=new Set([`${start.x},${start.y}`]);
  for(const point of queue)for(const [dx,dy] of [[20,0],[-20,0],[0,20],[0,-20]]){const next={x:point.x+dx,y:point.y+dy},key=`${next.x},${next.y}`;if(seen.has(key)||!standInRegion(grid,next.x,next.y))continue;seen.add(key);queue.push(next)}
  for(const target of [...world.residents,...world.props])assert.ok(queue.some(point=>Math.hypot(point.x-target.x,point.y-target.y)<70),`${theme}/${layout}: ${target.name} is reachable`);
 }
});
