import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothPosition} from '../dungeon/motion.js';
import {worldView} from '../dungeon/view.js';
test('movement smoothing is independent of refresh rate and never overshoots',()=>{
 const target={x:100,y:80};
 const run=hz=>{let p={x:0,y:0};for(let i=0;i<hz/2;i++)p=smoothPosition(p,target,1000/hz);return p};
 const a=run(60),b=run(120);assert.ok(Math.abs(a.x-b.x)<.001);assert.ok(a.x<=target.x&&a.y<=target.y);
});
test('camera and traveler stay aligned throughout a server movement update',()=>{
 let p={x:400,y:400};
 const start=worldView(1280,800,p);
 for(let i=0;i<20;i++){
  p=smoothPosition(p,{x:420,y:400},16);
  const view=worldView(1280,800,p);
  assert.ok(Math.abs((p.x-view.x)-(400-start.x))<.001);
 }
});
test('new scenes and reduced motion snap cleanly; stalled frames stay bounded',()=>{
 assert.deepEqual(smoothPosition(null,{x:50,y:40},16),{x:50,y:40,walking:false});
 assert.equal(smoothPosition({x:0,y:0},{x:500,y:0},16).x,500);
 assert.equal(smoothPosition({x:0,y:0},{x:20,y:0},16,{instant:true}).x,20);
 assert.equal(smoothPosition({x:0,y:0},{x:20,y:0},5000).x,smoothPosition({x:0,y:0},{x:20,y:0},100).x);
});
