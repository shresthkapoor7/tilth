import test from 'node:test';
import assert from 'node:assert/strict';
import {moveInScene} from '../dungeon/world.js';
import {DungeonRooms} from './dungeon-rooms.js';
const scene={title:'Court',narration:'Explore.',goal:'Find the seal.',theme:'volcanic',layout:'ruins',seed:411,enemies:[{name:'Watcher',kind:'dragon',color:'#aa7755',description:'A dragon'}],landmarks:[{name:'Seal',kind:'shrine'}],suggestions:[]};
async function setup(count=2){
 let now=1000,resolve,reject;
 const dm={configured:true,generate:async kind=>kind==='scene'?structuredClone(scene):new Promise((a,b)=>{resolve=a;reject=b})};
 const rooms=new DungeonRooms(dm,{clock:()=>now,roll:()=>1});
 const seat=rooms.create({name:'One',heroClass:'Warrior'});
 if(count===2)rooms.join(seat.code,{name:'Two',heroClass:'Mage'});
 const {r,p}=rooms.authorize(seat.code,seat.token);rooms.begin(r,p);await r.pending;
 return {rooms,r,p,advance(ms){now+=ms;r.players.forEach(p=>p.lastSeen=now)},resolve:v=>resolve(v),reject:e=>reject(e)};
}
test('shared minute expires once, rejects a late action and gives the next player a full minute',async()=>{
 const {rooms,r,p,advance}=await setup();const initial=rooms.snapshot(r,p);
 assert.equal(initial.turnDeadline-initial.serverNow,60000);
 advance(59999);assert.equal(rooms.snapshot(r,r.players[1]).turn,p.id);
 advance(1);assert.throws(()=>rooms.act(r,p,{kind:'end',actionId:'late-action'}),/expired/);
 const next=rooms.snapshot(r,p);assert.equal(next.turn,r.players[1].id);assert.equal(next.turnId,initial.turnId+1);assert.equal(next.turnDeadline-next.serverNow,60000);
 rooms.snapshot(r,p);assert.equal(r.turnId,next.turnId);
});
test('solo expiry advances enemy round and rejects a prepared action from the previous turn',async()=>{
 const {rooms,r,p,advance}=await setup(1),turnId=r.turnId;
 advance(60000);rooms.snapshot(r,p);assert.equal(r.round,2);
 assert.throws(()=>rooms.act(r,p,{kind:'guard',actionId:'stale-roll',turnId}),/turn has ended/);
});
test('AI latency pauses the clock; a failure preserves remaining time and success resets the next turn',async()=>{
 const {rooms,r,p,advance,resolve,reject}=await setup();advance(12000);
 rooms.act(r,p,{kind:'guard',actionId:'guard-failure'});await Promise.resolve();
 assert.equal(r.turnDeadline,null);assert.equal(r.turnRemaining,48000);
 advance(90000);rooms.snapshot(r,p);assert.equal(rooms.current(r),p);
 reject(new Error('Try again'));await r.pending;
 assert.equal(r.turnDeadline-rooms.clock(),48000);
 rooms.act(r,p,{kind:'guard',actionId:'guard-success'});await Promise.resolve();advance(90000);
 resolve({kind:'guard',targetId:p.id,difficulty:'easy',successText:'Guarded.',failureText:'Miss.',suggestions:[]});await r.pending;
 assert.equal(rooms.current(r),r.players[1]);assert.equal(r.turnDeadline-rooms.clock(),60000);
});
test('movement has no cumulative turn budget but still checks distance and terrain',async()=>{
 const {rooms,r,p}=await setup();
 // Use an open portion of the real map instead of assuming terrain tile encoding.
 const original={x:p.x,y:p.y};p.moved=100;
 const destination=[{x:p.x+20,y:p.y},{x:p.x-20,y:p.y},{x:p.x,y:p.y+20},{x:p.x,y:p.y-20}].find(to=>moveInScene(r.grid,p,to,100)&&r.players.every(o=>o===p||Math.hypot(o.x-to.x,o.y-to.y)>=18));
 assert.ok(destination);
 for(let i=0;i<8;i++)rooms.act(r,p,{kind:'move',actionId:`free-move-${i}`,...(i%2?original:destination)});
 assert.equal(r.turn,0);assert.throws(()=>rooms.act(r,p,{kind:'move',actionId:'teleport-attempt',x:9999,y:9999}),/Move up to/);
});
