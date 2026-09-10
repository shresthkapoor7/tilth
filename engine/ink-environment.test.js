import test from 'node:test';
import assert from 'node:assert/strict';
import {drawVolcanic} from '../volcanic.js';
import {houses,furnishings,obstacles,canStand,doorwayAt} from '../world.js';
import {ENVIRONMENT_KEYS,interiorAsset} from './ink-environment.js';

const ctx=new Proxy({getImageData:()=>({data:new Uint8ClampedArray(800*600*4)}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});

test('every authored outdoor prop has an available drawing and finite registration',()=>{
 const scene=drawVolcanic(ctx),keys=new Set(ENVIRONMENT_KEYS);
 assert.ok(scene.length>60);
 for(const p of scene){assert.ok(keys.has(p.asset),p.asset);for(const key of ['x','y','w','h'])assert.ok(Number.isFinite(p[key]),key);assert.ok(p.w>0&&p.h>0)}
 for(const h of houses){const p=scene.find(p=>p.asset==='building-'+h.id);assert.equal(p.x+p.w/2,h.x+h.w/2);assert.equal(p.y+p.h,h.y+75);assert.equal(doorwayAt(p.x+p.w/2,p.y+p.h-10,'up')?.id,h.id)}
 const bridge=scene.find(p=>p.asset==='bridge');for(const x of [580,620,670,712]){assert.ok(x>bridge.x&&x<bridge.x+bridge.w);assert.equal(canStand(x,475),true)}
});

test('collecting or rebuilding art records cannot accumulate or change collision geometry',()=>{
 const scene=drawVolcanic(ctx),first=JSON.stringify(scene),geometry=JSON.stringify(obstacles);
 drawVolcanic(ctx,scene);
 assert.equal(JSON.stringify(scene),first);assert.equal(JSON.stringify(obstacles),geometry);
 for(const h of houses){assert.equal(canStand(h.x+h.w/2,h.y+82),true);assert.equal(canStand(h.x+h.w/2,h.y+20),false)}
});

test('every existing interior furnishing is covered without altering its physics record',()=>{
 const before=JSON.stringify(furnishings),keys=new Set([...ENVIRONMENT_KEYS,'bed','table','chest']);
 for(const props of Object.values(furnishings))for(const f of props)assert.ok(keys.has(interiorAsset(f.type)),f.type);
 assert.equal(JSON.stringify(furnishings),before);
});
