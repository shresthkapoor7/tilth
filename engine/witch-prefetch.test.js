import test from 'node:test';
import assert from 'node:assert/strict';
import {WitchGreetingCache,witchEvidence} from './witch-prefetch.js';
import {WorldEffects} from './world-effects.js';
test('prefetch reuses a matching snapshot, invalidates changed actions and limits speculative calls',async()=>{
 let calls=0,time=0;const cache=new WitchGreetingCache(async()=>{calls++;return 'Greeting'},{clock:()=>time}),target={id:'1,0'};
 const first=cache.prefetch(target,[]);assert.equal(cache.prefetch(target,[]),first);await first;assert.equal(calls,1);
 assert.equal(await cache.take(target,[]).promise,'Greeting');assert.equal(cache.prefetch(target,[]),null);
 time=46000;await cache.prefetch(target,[]);assert.equal(cache.take(target,[{id:'new'}]),null);assert.equal(cache.entry,null);
});
test('witch evidence preserves useful errands as well as attacks',()=>{const events=Array.from({length:50},(_,i)=>({id:String(i),type:i%2?'rock_moved':'combat_hit',label:'Event'}));const evidence=witchEvidence({events});assert.ok(evidence.length<=20);assert.ok(evidence.some(e=>e.type==='rock_moved'));assert.ok(evidence.some(e=>e.type==='combat_hit'))});
test('ember trails warn before burning, stop in menus and expire; reduced motion disables shake',()=>{
 const fx=new WorldEffects(),p={x:300,y:300};assert.equal(fx.curse('ember_trail',p,1000,true),0);assert.equal(fx.curse('ember_trail',p,1500,true),0);assert.equal(fx.curse('ember_trail',p,2000,true),8);assert.equal(fx.curse('ember_trail',p,2100,true),0);assert.equal(fx.curse('ember_trail',p,2200,false),0);assert.equal(fx.sparks.length,0);
 fx.impact(0,0,40,3000,true);assert.equal(fx.freezeUntil,0);assert.equal(fx.shakeUntil,0);fx.impact(0,0,40,3000);assert.ok(fx.freezeUntil>3000);
});
