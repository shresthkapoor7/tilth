import {getWorldOverview,getMap,getNpc,searchAssets} from '../engine/creation-catalog.js';
import {CATALOG_VERSION,PROPOSAL_SCHEMAS,objectSchema,schemaErrors,getCreationCapabilities,validateProposal} from '../engine/creation-proposals.js';

const identifier={type:'string',minLength:1,maxLength:64};
const queryTools=[
  ['get_world_overview','List Tilth’s authored maps, NPCs and available content. This is not a live player save.',{},()=>getWorldOverview()],
  ['get_map','Inspect an authored map by ID. Coordinates are pixels; draft map proposals use a separate tile grid.',{mapId:identifier},({mapId})=>getMap(mapId)],
  ['get_npc','Inspect an authored NPC definition, personality and appearance. Health and location are spawn defaults.',{npcId:identifier},({npcId})=>getNpc(npcId)],
  ['search_assets','Find existing procedural appearance and prop recipes. No external asset search or image generation occurs.',{query:{type:'string',maxLength:160},kind:{type:'string',enum:['all','terrain','prop','character']}},({query,kind})=>searchAssets(query,kind)],
  ['get_creation_capabilities','Read supported draft geometry, entity limits, coordinate rules and installation limitations.',{},()=>getCreationCapabilities()]
];
const registry=new Map(queryTools.map(([name,description,properties,run])=>[name,{definition:{type:'function',name,description,strict:true,parameters:objectSchema(properties)},run:args=>({ok:true,data:run(args)})}]));
registry.set('validate_proposal',{
  definition:{type:'function',name:'validate_proposal',description:'Check a complete draft without submitting it. Returns error paths for repairing geometry, identifiers and references.',strict:true,parameters:objectSchema({proposal:{anyOf:Object.values(PROPOSAL_SCHEMAS)}})},
  run:({proposal})=>validateProposal(proposal)
});
for(const kind of Object.keys(PROPOSAL_SCHEMAS))registry.set(`propose_${kind}`,{
  definition:{type:'function',name:`propose_${kind}`,description:`Submit the final complete ${kind} draft for review. Nothing is applied to gameplay. Fix validation errors and resubmit if necessary.`,strict:true,parameters:PROPOSAL_SCHEMAS[kind]},
  run:proposal=>{const result=validateProposal(proposal);return result.ok?{...result,status:'draft',applied:false,catalogVersion:CATALOG_VERSION}:result;}
});

export const getCreationTools=()=>structuredClone([...registry.values()].map(t=>t.definition));

/** Pure application tools. Only the caller decides what to do with a valid proposal. */
export function executeCreationTool(name,args){
  const tool=registry.get(name);
  if(!tool)return {ok:false,errors:[{path:'$.tool',code:'unknown_tool',message:'Unknown creation tool.'}]};
  const errors=schemaErrors(tool.definition.parameters,args);
  if(errors.length)return {ok:false,errors};
  try{return tool.run(args);}catch(error){return {ok:false,errors:[{path:'$',code:'query',message:error instanceof Error?error.message:'Query failed.'}]};}
}
