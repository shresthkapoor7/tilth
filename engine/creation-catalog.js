import {ACTORS} from '../content/encounters.js';
import {CONFIG_VERSION,HOUSES} from '../content/game-config.js';
import {furnishings,magmaBank} from '../world.js';

const clone=value=>structuredClone(value);

function deepFreeze(value){
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.freeze(value);
  for(const child of Object.values(value))deepFreeze(child);
 }
 return value;
}

const houses=HOUSES.map(({id,name,x,y,w})=>({id,name,x,y,width:w}));

const outpost=deepFreeze({
 catalogVersion:CONFIG_VERSION,
 id:'outpost',
 name:'Cinderwatch Outpost',
 kind:'exterior',
 coordinateSystem:'pixels',
 dimensions:{width:800,height:600},
 renderer:{module:'volcanic.js',export:'drawVolcanic'},
 geometry:{
  canvasBounds:{x:0,y:0,width:800,height:600},
  authoredMovementBounds:{minX:35,maxX:765,minY:76,maxY:568},
  magmaBankPolygon:magmaBank.map(([x,y])=>[x,y]),
  bridgeDeck:{x:566,y:460,width:153,height:48},
  structures:houses.map(({id,name,x,y,width})=>({
   id,name,
   placement:{x,y,width},
   collisionBounds:{x,y:y-48,width,height:116},
   doorway:{centerX:x+width/2,actorAnchorY:{min:y+53,max:y+70},direction:'up',destinationMapId:id}
  }))
 },
 layout:{
  description:'An 800 × 600 volcanic outpost with three enterable buildings, a central forge and an eastern magma crossing.',
  interiorMapIds:houses.map(({id})=>id)
 },
 geometryLimitations:[
  'Rocks, dead trees, braziers, fences, the central forge, and other prop colliders are populated by drawVolcanic through render-time obstacle registration and are not available in the static world registry.',
  'Movement collision samples an actor foot box against the magma polygon and registered obstacles, so this snapshot is planning metadata rather than a complete collision mesh.'
 ]
});

const interiorMaps=houses.map(house=>deepFreeze({
 catalogVersion:CONFIG_VERSION,
 id:house.id,
 name:house.name,
 kind:'interior',
 parentMapId:'outpost',
 coordinateSystem:'pixels',
 dimensions:{width:800,height:600},
 renderer:{module:'interiors.js',export:'drawInterior',arguments:{room:house.id}},
 geometry:{
  canvasBounds:{x:0,y:0,width:800,height:600},
  renderedRoomBounds:{x:196,y:103,width:408,height:362},
  authoredMovementBounds:{minX:223,maxX:577,minFootY:164,maxFootY:440},
  furnishings:furnishings[house.id].map(({x,y,w,h,type})=>({x,y,width:w,height:h,type})),
  exit:{centerX:400,halfWidth:21,minActorAnchorY:419,direction:'down',destinationMapId:'outpost'}
 },
 layout:{
  exteriorPlacement:{x:house.x,y:house.y,width:house.width},
  description:`Authored interior of ${house.name}; furniture rectangles are shared by rendering and movement collision.`
 },
 geometryLimitations:[
  'Movement bounds describe the actor anchor and foot box used by canStand; they are not a general-purpose collision polygon.',
  'Decorative masonry, lighting and doorway pixels are produced inside drawInterior and are not exposed as separate reusable geometry.'
 ]
}));

const maps=deepFreeze([outpost,...interiorMaps]);

const npcs=deepFreeze(ACTORS.map(actor=>({
 catalogVersion:CONFIG_VERSION,
 id:actor.id,
 name:actor.name,
 mapId:'outpost',
 coordinateSystem:'pixels',
 authoredDefaults:{
  position:{x:actor.x,y:actor.y},
  role:actor.role,
  weapon:actor.weapon,
  color:actor.color,
  hitPoints:actor.hp,
  attackable:actor.attackable!==false,
  enemy:actor.enemy===true,
  personality:actor.personality,
  warning:actor.warning
 },
 currentStateAvailable:false,
 stateLimitations:[
  'These are authored spawn defaults from ACTORS; current position, health, hostility, combat state and dialogue are live runtime values and are not available here.'
 ]
})));

const integrated=(module,exportName)=>({module,export:exportName,mode:'integrated-layer'});
const prop=type=>({module:'interiors.js',export:'drawInterior',mode:'type-branch',selector:{type}});
const character=role=>({module:'volcanic.js',export:'drawHero',mode:'role-parameter',selector:{role}});

const assets=deepFreeze([
 {id:'terrain-stone',kind:'terrain',name:'Volcanic stone ground',description:'Cracked stone and ash ground painted as an integrated layer of the authored outpost renderer.',tags:['stone','ground','terrain','volcanic','ash','cracked','plaza'],renderer:integrated('volcanic.js','drawVolcanic'),renderableInCurrentWorld:true},
 {id:'terrain-wall',kind:'terrain',name:'Blackstone wall',description:'Masonry wall recipe painted inside the authored interior renderer; it is not a standalone wall function.',tags:['wall','stone','blackstone','masonry','interior','terrain'],renderer:integrated('interiors.js','drawInterior'),renderableInCurrentWorld:true},
 {id:'terrain-water',kind:'terrain',name:'Water',description:'Conceptual terrain vocabulary only; no reusable water renderer exists in the authored current world.',tags:['water','liquid','terrain','conceptual','unrendered'],renderer:{module:null,export:null,mode:'concept-only'},renderableInCurrentWorld:false},
 {id:'prop-bed',kind:'prop',name:'Bed',description:'Wood-framed bed with pillow, blanket and woven highlight, selected by a furnishing type branch.',tags:['bed','furniture','sleep','inn','home'],renderer:prop('bed'),renderableInCurrentWorld:true},
 {id:'prop-table',kind:'prop',name:'Table',description:'Wooden table with small authored tabletop details, selected by a furnishing type branch.',tags:['table','furniture','wood','surface','inn','home'],renderer:prop('table'),renderableInCurrentWorld:true},
 {id:'prop-chest',kind:'prop',name:'Chest',description:'Banded wooden storage chest selected by a furnishing type branch.',tags:['chest','furniture','storage','container','inn','smith','home'],renderer:prop('chest'),renderableInCurrentWorld:true},
 {id:'prop-hearth',kind:'prop',name:'Hearth',description:'Stone and ember smithy hearth selected by a furnishing type branch.',tags:['hearth','forge','fire','furniture','smith'],renderer:prop('hearth'),renderableInCurrentWorld:true},
 {id:'prop-shelf',kind:'prop',name:'Shelf',description:'Wooden storage shelf with small colored contents, selected by a furnishing type branch.',tags:['shelf','furniture','storage','books','smith','home'],renderer:prop('shelf'),renderableInCurrentWorld:true},
 {id:'prop-anvil',kind:'prop',name:'Anvil',description:'Layered metal smithy anvil selected by a furnishing type branch.',tags:['anvil','forge','metal','furniture','smith'],renderer:prop('anvil'),renderableInCurrentWorld:true},
 {id:'character-warrior',kind:'character',name:'Warrior',description:'Warrior role recipe rendered by drawHero with the role parameter.',tags:['warrior','fighter','sword','character','role'],renderer:character('Warrior'),renderableInCurrentWorld:true},
 {id:'character-mage',kind:'character',name:'Mage',description:'Mage caster role recipe rendered by drawHero with a staff and the role parameter.',tags:['mage','caster','staff','magic','character','role'],renderer:character('Mage'),renderableInCurrentWorld:true},
 {id:'character-rogue',kind:'character',name:'Rogue',description:'Rogue role recipe rendered by drawHero with the role parameter.',tags:['rogue','scout','bow','character','role'],renderer:character('Rogue'),renderableInCurrentWorld:true},
 {id:'character-healer',kind:'character',name:'Healer',description:'Healer caster role recipe rendered by drawHero with a staff and the role parameter.',tags:['healer','caster','staff','support','character','role'],renderer:character('Healer'),renderableInCurrentWorld:true}
]);

const overview=deepFreeze({
 catalogVersion:CONFIG_VERSION,
 name:'Cinderwatch authored world',
 dataScope:'authored-static-content',
 liveStateAvailable:false,
 coordinateSystem:'pixels',
 maps:maps.map(({id,name,kind})=>({id,name,kind})),
 npcs:npcs.map(({id,name,mapId,authoredDefaults:{role}})=>({id,name,mapId,role})),
 assets:{kinds:['terrain','prop','character'],count:assets.length},
 limitations:[
  'This catalog is a detached snapshot of authored source data and has no access to browser or runtime state.',
  'Map coordinates use current-world pixels; proposal tile coordinates require a separate contract.'
 ]
});

function requireString(value,label){
 if(typeof value!=='string')throw new TypeError(`${label} must be a string`);
}

export function getWorldOverview(){return clone(overview)}

export function getMap(mapId){
 requireString(mapId,'mapId');
 const map=maps.find(candidate=>candidate.id===mapId);
 if(!map)throw new RangeError(`Unknown map ID "${mapId}"`);
 return clone(map);
}

export function getNpc(npcId){
 requireString(npcId,'npcId');
 const npc=npcs.find(candidate=>candidate.id===npcId);
 if(!npc)throw new RangeError(`Unknown NPC ID "${npcId}"`);
 return clone(npc);
}

export function searchAssets(query,kind='all'){
 requireString(query,'query');
 requireString(kind,'kind');
 if(query.length>160)throw new RangeError('query must be at most 160 characters');
 if(!['terrain','prop','character','all'].includes(kind))throw new RangeError(`Unknown asset kind "${kind}"`);
 const words=query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
 return clone(assets.filter(asset=>{
  if(kind!=='all'&&asset.kind!==kind)return false;
  const fields=[asset.id,asset.kind,asset.name,asset.description,...asset.tags,asset.renderer.module,asset.renderer.export].filter(Boolean).map(value=>value.toLocaleLowerCase());
  const searchable=new Set(fields.flatMap(value=>[value,...value.split(/[^\p{L}\p{N}]+/u).filter(Boolean)]));
  return words.every(word=>searchable.has(word));
 }).slice(0,20));
}
