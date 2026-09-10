import {parseArgs} from 'node:util';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {productionServer} from '../server/start.js';
import {mapDraft,dungeonDraft,npcDraft} from '../test-support/creation-fixtures.js';
import {validateProposal} from '../engine/creation-proposals.js';

async function main(){
  const {values}=parseArgs({options:{live:{type:'boolean',default:false},kind:{type:'string',default:'dungeon'},brief:{type:'string',default:'Propose a small overgrown volcanic dungeon with a friendly guide and connected rooms.'}}});
  if(!['map','dungeon','npc'].includes(values.kind))throw new Error('--kind must be map, dungeon or npc.');
  if(values.live&&(!process.env.OPENAI_API_KEY||!process.env.OPENAI_MODEL))throw new Error('Live mode requires server-only OPENAI_API_KEY and OPENAI_MODEL. No fixture fallback was used.');
  const draft={map:mapDraft,dungeon:dungeonDraft,npc:npcDraft}[values.kind]();
  let upstreamCalls=0;
  const fixtureFetcher=async(_url,options)=>{
    upstreamCalls++;
    const request=JSON.parse(options.body);
    if(upstreamCalls===3){
      const errors=request.input.filter(item=>item.type==='function_call_output').map(item=>JSON.parse(item.output));
      if(!errors.some(result=>result.ok===false))throw new Error('Smoke did not receive a repairable validation error.');
    }
    let name='get_creation_capabilities',args={};
    if(upstreamCalls>1){name=`propose_${values.kind}`;args=structuredClone(draft);if(upstreamCalls===2){if(values.kind==='npc')args.npc.hp=10000;else if(values.kind==='map')args.map.entrance.x=100;else args.dungeon.connections[0].toMapId='unknown-room';}}
    return Response.json({id:`fixture-response-${upstreamCalls}`,status:'completed',output:[{type:'function_call',id:`fixture-item-${upstreamCalls}`,call_id:`fixture-call-${upstreamCalls}`,name,arguments:JSON.stringify(args)}]});
  };
  const server=productionServer({env:values.live?process.env:{OPENAI_API_KEY:'fixture-only',OPENAI_MODEL:'fixture-model',OPENAI_MAX_GENERATIONS:'6'},fetcher:values.live?fetch:fixtureFetcher});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    const manifest=await fetch(`${origin}/api/creation/tools`).then(r=>r.json());
    if(!manifest.tools?.some(tool=>tool.name==='get_map'))throw new Error('Creation tools were not served by the production HTTP server.');
    const response=await fetch(`${origin}/api/creation/propose`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({id:randomUUID(),kind:values.kind,brief:values.brief}),signal:AbortSignal.timeout(100000)});
    const result=await response.json();
    if(!response.ok)throw new Error(`Creation request failed (${response.status}): ${result.error||'Unknown error'}`);
    const validation=validateProposal(result.proposal);
    if(!validation.ok||result.applied!==false||result.status!=='draft')throw new Error('Creation response was not a valid unapplied draft.');
    process.stdout.write(`${JSON.stringify({mode:values.live?'live':'fixture',...(values.live?{}:{upstreamCalls}),result},null,2)}\n`);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
