import test from 'node:test';
import assert from 'node:assert/strict';
import {getWorldOverview,getMap,getNpc,searchAssets} from './creation-catalog.js';

test('world overview identifies the authored snapshot and all known authored IDs',()=>{
 const overview=getWorldOverview();
 assert.equal(overview.catalogVersion,1);
 assert.equal(overview.dataScope,'authored-static-content');
 assert.equal(overview.liveStateAvailable,false);
 assert.equal(overview.coordinateSystem,'pixels');
 assert.deepEqual(overview.maps.map(({id})=>id),['outpost','inn','smith','home']);
 assert.deepEqual(overview.npcs.map(({id})=>id),['rowan','lunara','clover','foxglove','ash-raider','cinder-sentry']);
});

test('outpost map exposes exact authored placements and bounded static geometry',()=>{
 const map=getMap('outpost');
 assert.equal(map.name,'Cinderwatch Outpost');
 assert.equal(map.coordinateSystem,'pixels');
 assert.deepEqual(map.dimensions,{width:800,height:600});
 assert.deepEqual(map.geometry.authoredMovementBounds,{minX:35,maxX:765,minY:76,maxY:568});
 assert.deepEqual(map.geometry.structures[0],{
  id:'inn',name:'The Ember Rest',placement:{x:116,y:165,width:130},
  collisionBounds:{x:116,y:117,width:130,height:116},
  doorway:{centerX:181,actorAnchorY:{min:218,max:235},direction:'up',destinationMapId:'inn'}
 });
 assert.deepEqual(map.geometry.magmaBankPolygon[0],[610,0]);
 assert.match(map.geometryLimitations.join(' '),/render-time obstacle registration/i);
});

test('interior maps expose authored furnishings, movement bounds and exit metadata',()=>{
 const inn=getMap('inn');
 assert.equal(inn.kind,'interior');
 assert.equal(inn.parentMapId,'outpost');
 assert.deepEqual(inn.geometry.authoredMovementBounds,{minX:223,maxX:577,minFootY:164,maxFootY:440});
 assert.deepEqual(inn.geometry.furnishings[0],{x:240,y:177,width:76,height:95,type:'bed'});
 assert.deepEqual(inn.geometry.exit,{centerX:400,halfWidth:21,minActorAnchorY:419,direction:'down',destinationMapId:'outpost'});
 assert.equal(getMap('smith').geometry.furnishings.some(({type})=>type==='anvil'),true);
 assert.equal(getMap('home').name,'The Watchkeeper’s House');
});

test('NPC queries report ACTORS spawn defaults without claiming current state',()=>{
 const npc=getNpc('lunara');
 assert.equal(npc.name,'Lunara');
 assert.equal(npc.mapId,'outpost');
 assert.deepEqual(npc.authoredDefaults.position,{x:290,y:315});
 assert.deepEqual(
  {role:npc.authoredDefaults.role,weapon:npc.authoredDefaults.weapon,hitPoints:npc.authoredDefaults.hitPoints,enemy:npc.authoredDefaults.enemy},
  {role:'Mage',weapon:'staff',hitPoints:85,enemy:false}
 );
 assert.equal(npc.currentStateAvailable,false);
 assert.match(npc.stateLimitations.join(' '),/health.*hostility/i);
 assert.equal('health' in npc,false);
 assert.equal('hostile' in npc,false);
});

test('asset search finds actual renderer recipes case-insensitively by words',()=>{
 assert.deepEqual(searchAssets('CASTER staff','character').map(({id})=>id),['character-mage','character-healer']);
 assert.deepEqual(searchAssets('storage','prop').map(({id})=>id),['prop-chest','prop-shelf']);
 assert.deepEqual(searchAssets('art','all'),[]);
 const bed=searchAssets('BED','prop')[0];
 assert.deepEqual(bed.renderer,{module:'interiors.js',export:'drawInterior',mode:'type-branch',selector:{type:'bed'}});
 assert.equal(bed.renderableInCurrentWorld,true);
});

test('asset listing contains only the specified reusable and conceptual assets with honest provenance',()=>{
 const assets=searchAssets('','all');
 assert.equal(assets.length,13);
 assert.deepEqual(assets.map(({id})=>id),[
  'terrain-stone','terrain-wall','terrain-water',
  'prop-bed','prop-table','prop-chest','prop-hearth','prop-shelf','prop-anvil',
  'character-warrior','character-mage','character-rogue','character-healer'
 ]);
 assert.ok(assets.length<=20);
 for(const asset of assets){
  assert.deepEqual(Object.keys(asset).sort(),['description','id','kind','name','renderableInCurrentWorld','renderer','tags'].sort());
  assert.ok(['terrain','prop','character'].includes(asset.kind));
 }
 const water=assets.find(({id})=>id==='terrain-water');
 assert.equal(water.renderableInCurrentWorld,false);
 assert.deepEqual(water.renderer,{module:null,export:null,mode:'concept-only'});
 assert.match(water.description,/no reusable water renderer/i);
 const stone=assets.find(({id})=>id==='terrain-stone');
 assert.deepEqual(stone.renderer,{module:'volcanic.js',export:'drawVolcanic',mode:'integrated-layer'});
});

test('catalog functions reject malformed queries and unknown IDs',()=>{
 assert.throws(()=>getMap(null),{name:'TypeError',message:'mapId must be a string'});
 assert.throws(()=>getMap('ruins'),/Unknown map ID "ruins"/);
 assert.throws(()=>getNpc({}),{name:'TypeError',message:'npcId must be a string'});
 assert.throws(()=>getNpc('missing'),/Unknown NPC ID "missing"/);
 assert.throws(()=>searchAssets(3),{name:'TypeError',message:'query must be a string'});
 assert.throws(()=>searchAssets('x'.repeat(161)),/query must be at most 160 characters/);
 assert.throws(()=>searchAssets('','weapon'),/Unknown asset kind "weapon"/);
 assert.throws(()=>searchAssets('',null),{name:'TypeError',message:'kind must be a string'});
});

test('all returned catalog values are detached snapshots',()=>{
 const overview=getWorldOverview();
 overview.maps[0].name='Changed';
 overview.npcs.length=0;
 assert.equal(getWorldOverview().maps[0].name,'Cinderwatch Outpost');
 assert.equal(getWorldOverview().npcs.length,6);

 const map=getMap('inn');
 map.geometry.furnishings[0].x=-1;
 map.geometryLimitations.push('Changed');
 assert.equal(getMap('inn').geometry.furnishings[0].x,240);
 assert.equal(getMap('inn').geometryLimitations.includes('Changed'),false);

 const npc=getNpc('rowan');
 npc.authoredDefaults.position.x=-1;
 assert.equal(getNpc('rowan').authoredDefaults.position.x,268);

 const assets=searchAssets('','all');
 assets[0].tags.push('changed');
 assets[0].renderer.module='changed.js';
 assert.equal(searchAssets('','all')[0].tags.includes('changed'),false);
 assert.equal(searchAssets('','all')[0].renderer.module,'volcanic.js');
});
