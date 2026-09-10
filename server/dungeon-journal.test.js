import test from 'node:test';
import assert from 'node:assert/strict';
import {DungeonRooms} from './dungeon-rooms.js';
import {journalMoves,actionTargets} from '../dungeon/journal.js';
const scene={title:'The ash court',narration:'The dragon watches.',goal:'Secure the seal.',theme:'volcanic',layout:'ruins',seed:411,enemies:[{name:'Ashwing',kind:'dragon',color:'#aa7755',description:'A dragon'}],landmarks:[{name:'The Seal',kind:'shrine'}],suggestions:[]};
async function table(roll=()=>12) {
  let resolve;
  const dm={configured:true,generate:async kind=>kind==='scene'?structuredClone(scene):new Promise(r=>resolve=r)};
  const rooms=new DungeonRooms(dm,{roll});
  const a=rooms.create({name:'Same name',heroClass:'Warrior'}),b=rooms.join(a.code,{name:'Same name',heroClass:'Healer'});
  const {r,p}=rooms.authorize(a.code,a.token);rooms.begin(r,p);await r.pending;
  return {rooms,r,p,other:r.players[1],a,b,resolve:v=>resolve(v)};
}
const ruling=(kind,id)=>({kind,targetId:id,difficulty:'standard',successText:'The action succeeds.',failureText:'The action misses.',suggestions:[]});
test('the room shares one authoritative roll and records it only in the acting player journal',async()=>{
  const {rooms,r,p,other,resolve,a,b}=await table(sides=>sides);
  const enemy=r.scene.creatures[0];p.x=enemy.x;p.y=enemy.y+20;
  const input={kind:'attack',targetId:enemy.id,actionId:'journal-strike-1',die:1,success:false};
  rooms.act(r,p,input);await Promise.resolve();
  assert.equal(rooms.snapshot(r,other).pendingRoll.actorId,p.id);
  assert.equal(r.rolls.length,0);
  resolve(ruling('attack',enemy.id));await r.pending;
  const result=r.rolls[0];assert.equal(result.die,20);assert.equal(result.bonus,4);assert.equal(result.total,24);assert.equal(result.dc,14);assert.equal(result.amount,18);assert.equal(result.success,true);
  assert.deepEqual(rooms.snapshot(r,p).rolls,rooms.snapshot(r,other).rolls);
  assert.equal(p.journal.length,1);assert.equal(other.journal.length,0);assert.equal(p.journal[0].actorId,p.id);
  assert.equal(r.pendingRoll,null);assert.equal(r.busy,false);
  rooms.act(r,p,input);assert.equal(r.rolls.length,1);assert.equal(p.journal.length,1);
  const publicState=JSON.stringify(rooms.snapshot(r,other));assert.ok(!publicState.includes(a.token));assert.ok(!publicState.includes(b.token));
});
test('failed rulings publish no invented dice or journal entry and preserve the turn',async()=>{
  let rolls=0;const {rooms,r,p,resolve}=await table(()=>{rolls++;return 20});
  rooms.act(r,p,{kind:'improvise',text:'I inspect a seal',actionId:'invalid-journal-1'});await Promise.resolve();
  resolve(ruling('interact','invented-target'));await r.pending;
  assert.equal(rolls,0);assert.equal(r.rolls.length,0);assert.equal(p.journal.length,0);assert.equal(r.pendingRoll,null);assert.equal(rooms.current(r).id,p.id);assert.ok(r.error);
});
test('a failed check is recorded and guard is explicitly automatic without a fake d20',async()=>{
  let rolls=0;const {rooms,r,p,other,resolve}=await table(()=>{rolls++;return 1});
  const enemy=r.scene.creatures[0];p.x=enemy.x;p.y=enemy.y+20;
  rooms.act(r,p,{kind:'attack',targetId:enemy.id,actionId:'natural-one-1'});await Promise.resolve();resolve(ruling('attack',enemy.id));await r.pending;
  assert.equal(r.rolls[0].success,false);assert.equal(r.rolls[0].die,1);assert.equal(p.journal[0].narration,'The action misses.');
  // No enemy retaliation during this assertion; the first player's turn will end normally.
  r.turn=0;const before=rolls;
  rooms.act(r,p,{kind:'guard',targetId:p.id,actionId:'automatic-guard-1'});await Promise.resolve();resolve(ruling('guard',p.id));await r.pending;
  assert.equal(rolls,before);assert.equal(r.rolls.at(-1).automatic,true);assert.equal(r.rolls.at(-1).die,null);assert.equal(r.rolls.at(-1).dc,null);assert.equal(p.guard,true);assert.equal(other.journal.length,0);
});
test('journals show real class abilities, current resources and actionable targets',async()=>{
  const {rooms,r,p,other}=await table();
  const enemy=r.scene.creatures[0];p.x=enemy.x;p.y=enemy.y+20;
  const state=rooms.snapshot(r,p);
  let moves=journalMoves(state,p,r.grid);
  assert.equal(moves.find(a=>a.kind==='attack').label,'Sword strike');assert.equal(moves.find(a=>a.kind==='attack').reason,'');
  p.moved=100;p.heals=0;
  moves=journalMoves(state,p,r.grid);
  assert.equal(moves.find(a=>a.kind==='move').reason,'');assert.equal(moves.find(a=>a.kind==='heal').reason,'No healing charges');
  assert.match(journalMoves(state,other,r.grid).find(a=>a.kind==='heal').description,/3 charges/);
  assert.equal(journalMoves(state,other,r.grid)[0].reason,'Waiting for turn');
  assert.equal(actionTargets(state,p,'heal',r.grid)[0].reason,'No healing charges');
});
