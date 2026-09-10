import test from 'node:test';
import assert from 'node:assert/strict';
import {furnishings,advance,exitAt} from '../world.js';
import {furniturePlacement,orderedInterior,studyMovement,walkFrame,supportsInkAvatar} from './ink-study.js';
import {DEFAULT_CHARACTER} from '../content/characters.js';

test('illustrated furniture keeps the existing footprint width and ground contact',()=>{
 const before=JSON.stringify(furnishings);
 for(const f of furnishings.inn){const p=furniturePlacement(f);assert.equal(p.x,f.x);assert.equal(p.y,f.y);assert.equal(p.w,f.w);assert.equal(p.h,f.h);assert.equal(p.y+p.h,f.y+f.h);assert.equal(p.depth,f.y+f.h)}
 assert.equal(JSON.stringify(furnishings),before);
});
test('the same table can occlude an actor behind it and be occluded from the front',()=>{
 const tableIndex=furnishings.inn.findIndex(f=>f.type==='table');
 for(const [y,behind] of [[260,true],[355,false]]){const order=orderedInterior('inn',y);assert.equal(order.findIndex(i=>i.kind==='player')<order.findIndex(i=>i.index===tableIndex),behind)}
});
test('continuous study movement uses the existing walls and retains the exit',()=>{
 const v=studyMovement(new Set(['up','right']),50);assert.ok(Math.abs(Math.hypot(v.x,v.y)-7.25)<1e-9);
 assert.deepEqual(studyMovement(new Set(['up','down']),50),{x:0,y:0});
 assert.deepEqual(studyMovement(new Set(['right']),1000),studyMovement(new Set(['right']),50));
 let p={x:400,y:397};for(let i=0;i<100;i++)p=advance(p,0,studyMovement(new Set(['up']),50).y,'inn');
 const table=furnishings.inn.find(f=>f.type==='table');assert.ok(p.y+7>=table.y+table.h&&p.y+7<table.y+table.h+1);assert.equal(exitAt(400,421,'down'),true);
 let behind={x:400,y:250};for(let i=0;i<100;i++)behind=advance(behind,0,studyMovement(new Set(['down']),50).y,'inn');
 assert.ok(behind.y+14<=furnishings.inn.find(f=>f.type==='table').y);
});
test('walk and turn selection only uses prepared cells, including reduced motion',()=>{
 for(let d=0;d<2000;d++){assert.ok(walkFrame(d,true)>=0&&walkFrame(d,true)<6)}
 assert.equal(walkFrame(900,true,100),6);assert.equal(walkFrame(900,true,20),7);assert.equal(walkFrame(900,true,100,true),7);assert.equal(walkFrame(900,false),7);
});
test('the prepared avatar cannot conceal unsupported character editor choices',()=>{
 assert.equal(supportsInkAvatar(DEFAULT_CHARACTER),true);
 assert.equal(supportsInkAvatar({...DEFAULT_CHARACTER,name:'Ember',weapon:'bow'}),true);
 for(const change of [{hairStyle:'Braid'},{hairColor:'#302d2b'},{skinColor:'#774d3d'},{clothing:'Armor'},{outfitColor:'#497985'}])assert.equal(supportsInkAvatar({...DEFAULT_CHARACTER,...change}),false);
 assert.equal(supportsInkAvatar(undefined),false);
});
