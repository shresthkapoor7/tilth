import {CATALOG_VERSION,validateProposal} from '../engine/creation-proposals.js';
import {executeCreationTool,getCreationTools} from './creation-tools.js';

const RESPONSES_URL='https://api.openai.com/v1/responses';
const MAX_RESPONSES=6;
const MAX_TOOL_CALLS=24;
const PROPOSAL_TOOLS=new Set(['propose_map','propose_dungeon','propose_npc']);
const INSTRUCTIONS=`You author reviewable draft content for Tilth, a volcanic pixel RPG. Inspect the authored world, creation capabilities, and available assets as needed with the supplied tools. Submit exactly one complete proposal with propose_map, propose_dungeon, or propose_npc matching the requested kind. Use validation errors to repair the draft before resubmitting. Do not change the live world, apply content, write code, call external services, or claim that a draft has been installed.`;

export class CreationRunnerError extends Error{
  constructor(status,message){super(message);this.name='CreationRunnerError';this.status=status;}
}

const failure=(status,message)=>new CreationRunnerError(status,message);
const invalidArguments=()=>({ok:false,errors:[{path:'$',code:'arguments',message:'Tool arguments must be one JSON object.'}]});
const wrongKind=kind=>({ok:false,errors:[{path:'$.kind',code:'requested_kind',message:`Submit one ${kind} proposal for this request.`}]});
const ambiguousProposal=()=>({ok:false,errors:[{path:'$',code:'ambiguous_proposal',message:'Submit exactly one final proposal in a response.'}]});

function containsRefusal(output){
  return output.some(item=>item?.type==='refusal'||(Array.isArray(item?.content)&&item.content.some(part=>part?.type==='refusal')));
}

async function runJob({kind,brief},{apiKey,model,fetcher,consumeBudget,signal}){
  const input=[{role:'user',content:[{type:'input_text',text:JSON.stringify({requestedKind:kind,creativeBrief:brief})}]}];
  const toolsUsed=[];
  let toolCallCount=0;
  for(let round=0;round<MAX_RESPONSES;round++){
    if(!consumeBudget())throw failure(429,'The local server generation budget has been reached.');
    let upstream;
    try{
      upstream=await fetcher(RESPONSES_URL,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,store:false,instructions:INSTRUCTIONS,input,tools:getCreationTools(),parallel_tool_calls:false,max_output_tokens:12000}),signal});
    }catch(error){
      if(signal.aborted)throw failure(504,'Creation timed out; no draft was produced.');
      throw failure(502,'Creation service request failed; no draft was produced.');
    }
    if(!upstream?.ok)throw failure(502,'Creation service request failed; no draft was produced.');
    let response;
    try{response=await upstream.json();}catch(error){
      if(signal.aborted)throw failure(504,'Creation timed out; no draft was produced.');
      throw failure(502,'Creation service returned an invalid response; no draft was produced.');
    }
    if(!response||response.status!=='completed'||!Array.isArray(response.output))throw failure(502,'Creation was incomplete; no draft was produced.');
    if(containsRefusal(response.output))throw failure(502,'Creation was declined; no draft was produced.');
    const calls=response.output.filter(item=>item?.type==='function_call');
    if(calls.some(call=>typeof call.call_id!=='string'||!call.call_id||typeof call.name!=='string'||!call.name||typeof call.arguments!=='string'))throw failure(502,'Creation service returned an invalid response; no draft was produced.');
    toolCallCount+=calls.length;
    if(toolCallCount>MAX_TOOL_CALLS)throw failure(502,'Creation exceeded the tool-call limit; no draft was produced.');
    if(calls.length===0)throw failure(502,'Creation returned no submitted draft.');

    const proposalCalls=calls.filter(call=>PROPOSAL_TOOLS.has(call.name));
    const outputs=[];
    let terminal;
    for(const call of calls){
      toolsUsed.push(call.name);
      let result;
      if(PROPOSAL_TOOLS.has(call.name)&&proposalCalls.length>1){
        result=ambiguousProposal();
      }else{
        let args;
        try{args=JSON.parse(call.arguments);}catch{result=invalidArguments();}
        if(!result){
          if(PROPOSAL_TOOLS.has(call.name)&&call.name!==`propose_${kind}`)result=wrongKind(kind);
          else result=executeCreationTool(call.name,args);
        }
      }
      outputs.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)});
      if(call.name===`propose_${kind}`&&proposalCalls.length===1&&result.ok){
        const checked=validateProposal(structuredClone(result.proposal));
        if(checked.ok)terminal={status:'draft',applied:false,catalogVersion:CATALOG_VERSION,proposal:structuredClone(checked.proposal),toolsUsed:[...toolsUsed]};
      }
    }
    if(terminal)return terminal;
    input.push(...structuredClone(response.output),...outputs);
  }
  throw failure(502,'Creation exceeded the response limit; no draft was produced.');
}

export async function runCreationProposal(request,options={}){
  const {apiKey,model,fetcher=fetch,consumeBudget=()=>true}=options;
  const timeoutMs=Number.isFinite(options.timeoutMs)&&options.timeoutMs>0?options.timeoutMs:90000;
  const controller=new AbortController();
  let timer;
  const deadline=new Promise((resolve,reject)=>{
    timer=setTimeout(()=>{controller.abort();reject(failure(504,'Creation timed out; no draft was produced.'));},timeoutMs);
  });
  try{
    return await Promise.race([runJob(request,{apiKey,model,fetcher,consumeBudget,signal:controller.signal}),deadline]);
  }catch(error){
    if(error instanceof CreationRunnerError)throw error;
    throw failure(502,'Creation could not be completed; no draft was produced.');
  }finally{
    clearTimeout(timer);
    controller.abort();
  }
}
