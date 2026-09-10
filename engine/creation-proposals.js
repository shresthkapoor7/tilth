import {ACTORS} from '../content/encounters.js';
import {CONFIG_VERSION,HOUSES,CLASS_COLORS} from '../content/game-config.js';
import {WEAPONS} from '../content/characters.js';
import {searchAssets} from './creation-catalog.js';

export const CATALOG_VERSION = CONFIG_VERSION;
const string = (maxLength=1000) => ({type:'string',minLength:1,maxLength});
const id = {type:'string',pattern:'^[a-z][a-z0-9-]{0,63}$',minLength:1,maxLength:64};
const integer = (minimum,maximum) => ({type:'integer',minimum,maximum});
const choice = values => ({type:'string',enum:values});
export const objectSchema = properties => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const array = (items,maxItems,minItems=0) => ({type:'array',items,minItems,maxItems});
const position = {x:integer(0,39),y:integer(0,29)};
const npc = objectSchema({id,name:string(60),description:string(1000),role:choice(Object.keys(CLASS_COLORS)),weapon:choice(Object.keys(WEAPONS)),hp:integer(1,280),personality:string(500),openingLine:string(240),disposition:choice(['friendly','neutral','hostile']),appearanceAssetId:id});
const map = objectSchema({
  id,name:string(80),description:string(1200),theme:string(240),width:integer(8,40),height:integer(8,30),
  tiles:array({type:'string',pattern:'^[#.~]+$',minLength:8,maxLength:40},30,8),
  entrance:objectSchema(position),
  exits:array(objectSchema({id,label:string(120),...position}),4,1),
  props:array(objectSchema({id,assetId:id,...position,blocking:{type:'boolean'}}),48),
  npcs:array(objectSchema({npcId:id,...position}),16)
});
export const PROPOSAL_SCHEMAS = {
  npc:objectSchema({kind:choice(['npc']),notes:string(1200),npc}),
  map:objectSchema({kind:choice(['map']),notes:string(1200),map,npcs:array(npc,16)}),
  dungeon:objectSchema({kind:choice(['dungeon']),notes:string(1200),npcs:array(npc,32),dungeon:objectSchema({
    id,name:string(80),description:string(1200),entryMapId:id,maps:array(map,8,1),
    connections:array(objectSchema({fromMapId:id,fromExitId:id,toMapId:id,toExitId:id}),16)
  })})
};

/** The small schema subset used by the tools, with actionable paths for model repair. */
export function schemaErrors(schema,value,path='$') {
  const error = message => [{path,code:'schema',message}];
  if(schema.anyOf) return schema.anyOf.some(option=>schemaErrors(option,value,path).length===0)?[]:error('Value must match one supported proposal schema.');
  if(schema.type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value))return error('Expected an object.');
    const errors=[];
    for(const key of Object.keys(value))if(!Object.hasOwn(schema.properties,key))errors.push({path:`${path}.${key}`,code:'unknown_field',message:'Field is not supported.'});
    for(const key of schema.required){if(!Object.hasOwn(value,key))errors.push({path:`${path}.${key}`,code:'required',message:'Required field is missing.'});else errors.push(...schemaErrors(schema.properties[key],value[key],`${path}.${key}`));}
    return errors.slice(0,32);
  }
  if(schema.type==='array'){
    if(!Array.isArray(value)||value.length<schema.minItems||value.length>schema.maxItems)return error(`Expected ${schema.minItems}–${schema.maxItems} entries.`);
    return value.flatMap((item,index)=>schemaErrors(schema.items,item,`${path}[${index}]`)).slice(0,32);
  }
  if(schema.type==='integer')return Number.isInteger(value)&&value>=schema.minimum&&value<=schema.maximum?[]:error(`Expected an integer from ${schema.minimum} to ${schema.maximum}.`);
  if(schema.type==='boolean')return typeof value==='boolean'?[]:error('Expected true or false.');
  if(schema.type==='string'){
    if(typeof value!=='string'||(schema.minLength!==undefined&&value.trim().length<schema.minLength)||(schema.maxLength!==undefined&&value.length>schema.maxLength))return error('Expected text within the declared length bounds.');
    if(schema.enum&&!schema.enum.includes(value))return error(`Choose one of: ${schema.enum.join(', ')}.`);
    if(schema.pattern&&!new RegExp(schema.pattern).test(value))return error(`Text must match ${schema.pattern}.`);
    return [];
  }
  return error('Unsupported schema.');
}

export function getCreationCapabilities(){
  return {catalogVersion:CATALOG_VERSION,output:'reviewable drafts only; no live world mutation',
    currentWorld:'Authored maps use pixel coordinates; queries are authored defaults, not a live save.',
    draftCoordinates:'Tile coordinates: x right, y down; each prop occupies one tile. A future renderer/installer must translate these blueprints.',
    terrain:{'#':'wall, blocked','.':'floor, walkable','~':'water, blocked; visual proposal only'},
    limits:{width:[8,40],height:[8,30],mapsPerDungeon:8,npcsPerDungeon:32,exitsPerMap:4,propsPerMap:48},
    rules:['Use new map and NPC IDs; never overwrite authored identities.','Every boundary tile is a wall. Entrances, exits and NPCs are distinct floor cells.','Keep exits and NPCs reachable from the entrance after blocking props are placed. Props must be approachable.','All NPC placements reference definitions included in the proposal. Each NPC appears once.','Dungeon connections join unique named exits bidirectionally; every map is reachable from entryMapId.','Use catalog prop/character IDs. Reusing an appearance does not create new artwork.'],
    proposalKinds:Object.keys(PROPOSAL_SCHEMAS)};
}

export function validateProposal(input){
  if(!input||!Object.hasOwn(PROPOSAL_SCHEMAS,input.kind))return {ok:false,errors:[{path:'$.kind',code:'kind',message:'Choose map, dungeon or npc.'}]};
  const errors=schemaErrors(PROPOSAL_SCHEMAS[input.kind],input);
  if(errors.length)return {ok:false,errors};
  const add=(path,code,message)=>errors.push({path,code,message});
  const unique=(values,path)=>{const seen=new Set();for(const [i,value] of values.entries()){if(seen.has(value))add(`${path}[${i}]`,'duplicate',`Duplicate identifier: ${value}.`);seen.add(value);}};
  const definitions=input.kind==='npc'?[input.npc]:input.npcs;
  const knownNpcs=new Set(definitions.map(n=>n.id));
  const assets=new Map(searchAssets('','all').map(a=>[a.id,a]));
  unique(definitions.map(n=>n.id),'$.npcs');
  for(const [i,n] of definitions.entries()){
    const path=input.kind==='npc'?'$.npc':`$.npcs[${i}]`;
    if(ACTORS.some(a=>a.id===n.id))add(`${path}.id`,'reserved','Choose a new NPC ID; this one belongs to an authored character.');
    if(assets.get(n.appearanceAssetId)?.kind!=='character')add(`${path}.appearanceAssetId`,'asset','Choose a catalog character appearance.');
  }
  const maps=input.kind==='map'?[input.map]:input.kind==='dungeon'?input.dungeon.maps:[];
  const mapById=new Map(maps.map(m=>[m.id,m]));
  unique(maps.map(m=>m.id),'$.maps');
  const placedNpcs=new Set();
  for(const [index,m] of maps.entries()){
    const path=input.kind==='map'?'$.map':`$.dungeon.maps[${index}]`;
    if(m.id==='outpost'||HOUSES.some(h=>h.id===m.id))add(`${path}.id`,'reserved','Choose a new map ID; this one belongs to an authored map.');
    if(m.tiles.length!==m.height||m.tiles.some(row=>row.length!==m.width)){add(`${path}.tiles`,'dimensions','Tile rows must exactly match width and height.');continue;}
    if(m.tiles.some((row,y)=>[...row].some((tile,x)=>(y===0||y===m.height-1||x===0||x===m.width-1)&&tile!=='#')))add(`${path}.tiles`,'boundary','All outer tiles must be walls.');
    const key=p=>`${p.x},${p.y}`;
    const floor=p=>p.x>=0&&p.x<m.width&&p.y>=0&&p.y<m.height&&m.tiles[p.y][p.x]==='.';
    const occupied=new Set();
    const reserve=(p,at)=>{if(!floor(p))add(at,'placement','Place this on a floor tile within the map.');if(occupied.has(key(p)))add(at,'overlap','Entrance, exits, props and NPCs must occupy distinct cells.');occupied.add(key(p));};
    reserve(m.entrance,`${path}.entrance`);
    unique(m.exits.map(e=>e.id),`${path}.exits`);unique(m.props.map(p=>p.id),`${path}.props`);
    for(const [i,e] of m.exits.entries())reserve(e,`${path}.exits[${i}]`);
    for(const [i,p] of m.props.entries()){
      reserve(p,`${path}.props[${i}]`);
      if(assets.get(p.assetId)?.kind!=='prop')add(`${path}.props[${i}].assetId`,'asset','Choose a catalog prop asset.');
    }
    for(const [i,n] of m.npcs.entries()){
      reserve(n,`${path}.npcs[${i}]`);
      if(!knownNpcs.has(n.npcId))add(`${path}.npcs[${i}].npcId`,'reference','Include this NPC definition in the proposal.');
      if(placedNpcs.has(n.npcId))add(`${path}.npcs[${i}].npcId`,'duplicate','An NPC identity may be placed only once in the proposal.');
      placedNpcs.add(n.npcId);
    }
    const blocked=new Set(m.props.filter(p=>p.blocking).map(key));
    const reached=new Set();const queue=[];
    if(floor(m.entrance)&&!blocked.has(key(m.entrance))){queue.push(m.entrance);reached.add(key(m.entrance));}
    const neighbors=p=>[{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}];
    for(let i=0;i<queue.length;i++)for(const p of neighbors(queue[i]))if(floor(p)&&!blocked.has(key(p))&&!reached.has(key(p))){queue.push(p);reached.add(key(p));}
    for(const [i,e] of m.exits.entries())if(!reached.has(key(e)))add(`${path}.exits[${i}]`,'unreachable','Exit must be reachable from the entrance.');
    for(const [i,n] of m.npcs.entries())if(!reached.has(key(n)))add(`${path}.npcs[${i}]`,'unreachable','NPC must be reachable from the entrance.');
    for(const [i,p] of m.props.entries())if(!reached.has(key(p))&&!neighbors(p).some(n=>reached.has(key(n))))add(`${path}.props[${i}]`,'unreachable','Prop must be approachable from a reachable floor tile.');
  }
  if(input.kind!=='npc')for(const n of definitions)if(!placedNpcs.has(n.id))add('$.npcs','unplaced',`Place NPC ${n.id} on a proposed map.`);
  if(input.kind==='dungeon'){
    const d=input.dungeon, used=new Set(), graph=new Map(maps.map(m=>[m.id,new Set()]));
    if(!mapById.has(d.entryMapId))add('$.dungeon.entryMapId','reference','Entry map must be included in the dungeon.');
    for(const [i,c] of d.connections.entries()){
      const path=`$.dungeon.connections[${i}]`;
      if(c.fromMapId===c.toMapId)add(path,'connection','Connect two different maps.');
      for(const side of ['from','to']){
        const mapId=c[`${side}MapId`],exitId=c[`${side}ExitId`];
        if(!mapById.get(mapId)?.exits.some(e=>e.id===exitId))add(path,'reference',`Unknown map/exit endpoint ${mapId}/${exitId}.`);
        const endpoint=`${mapId}/${exitId}`;if(used.has(endpoint))add(path,'duplicate','Each exit can belong to only one connection.');used.add(endpoint);
      }
      if(graph.has(c.fromMapId)&&graph.has(c.toMapId)){graph.get(c.fromMapId).add(c.toMapId);graph.get(c.toMapId).add(c.fromMapId);}
    }
    const reached=new Set([d.entryMapId]);const queue=[d.entryMapId];
    for(let i=0;i<queue.length;i++)for(const next of graph.get(queue[i])||[])if(!reached.has(next)){reached.add(next);queue.push(next);}
    for(const m of maps)if(!reached.has(m.id))add('$.dungeon.connections','unreachable',`Map ${m.id} is disconnected from the entry map.`);
  }
  return errors.length?{ok:false,errors:errors.slice(0,32)}:{ok:true,proposal:structuredClone(input)};
}
