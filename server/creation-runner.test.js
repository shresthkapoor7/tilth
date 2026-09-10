import test from 'node:test';
import assert from 'node:assert/strict';
import {runCreationProposal} from './creation-runner.js';
import {mapDraft,dungeonDraft,npcDraft} from '../test-support/creation-fixtures.js';

const functionCall=(callId,name,args,id=`fc-${callId}`)=>({
  type:'function_call',id,call_id:callId,name,arguments:JSON.stringify(args),status:'completed'
});
const assistantText=(text,id='msg-1')=>({
  type:'message',id,role:'assistant',status:'completed',
  content:[{type:'output_text',annotations:[],logprobs:[],text}]
});
const refusal=(text='Unable to comply.')=>({
  type:'message',id:'msg-refusal',role:'assistant',status:'completed',
  content:[{type:'refusal',refusal:text}]
});
const responseBody=(output,{status='completed'}={})=>({
  id:'resp-test',object:'response',created_at:1,status,error:null,
  incomplete_details:status==='incomplete'?{reason:'max_output_tokens'}:null,
  instructions:null,max_output_tokens:12000,model:'test-model',output,
  parallel_tool_calls:false,previous_response_id:null,store:false,
  temperature:1,text:{format:{type:'text'}},tool_choice:'auto',tools:[],top_p:1,
  usage:{input_tokens:1,input_tokens_details:{cached_tokens:0},output_tokens:1,output_tokens_details:{reasoning_tokens:0},total_tokens:2}
});
const upstream=(body,{ok=true,status=200,json}={})=>({
  ok,status,headers:new Headers({'content-type':'application/json'}),
  json:json||(()=>Promise.resolve(structuredClone(body)))
});
const sequentialFetcher=(bodies,captured=[])=>async(url,options)=>{
  captured.push({url,options,body:JSON.parse(options.body)});
  const body=bodies.shift();
  assert.ok(body,'Unexpected extra upstream request.');
  return upstream(body);
};
const options=(fetcher,extra={})=>({
  apiKey:'server-secret',model:'test-model',fetcher,consumeBudget:()=>true,...extra
});

test('carries every output item and repair result through query, invalid draft, and successful repair',async()=>{
  const invalid=mapDraft();invalid.map.tiles[1]='#..#';
  const firstOutput=[assistantText('I will inspect the world.'),functionCall('call-query','get_world_overview',{})];
  const secondOutput=[functionCall('call-invalid','propose_map',invalid)];
  const thirdOutput=[functionCall('call-final','propose_map',mapDraft())];
  const captured=[];
  const fetcher=sequentialFetcher([
    responseBody(firstOutput),responseBody(secondOutput),responseBody(thirdOutput)
  ],captured);

  const result=await runCreationProposal({kind:'map',brief:'Create an overgrown entrance hall.'},options(fetcher));

  assert.equal(result.status,'draft');
  assert.equal(result.applied,false);
  assert.deepEqual(result.proposal,mapDraft());
  assert.deepEqual(result.toolsUsed,['get_world_overview','propose_map','propose_map']);
  assert.equal(captured.length,3);
  assert.equal(captured[0].url,'https://api.openai.com/v1/responses');
  assert.equal(captured[0].body.store,false);
  assert.equal(captured[0].body.parallel_tool_calls,false);
  assert.equal(captured[0].body.max_output_tokens,12000);
  assert.ok(captured[0].body.tools.some(tool=>tool.name==='get_world_overview'));
  assert.match(captured[0].body.instructions,/inspect the authored world/i);
  assert.match(captured[0].body.instructions,/do not change/i);
  assert.deepEqual(captured[1].body.input.slice(1,3),firstOutput);
  const queryOutput=captured[1].body.input[3];
  assert.equal(queryOutput.type,'function_call_output');
  assert.equal(queryOutput.call_id,'call-query');
  assert.equal(JSON.parse(queryOutput.output).ok,true);
  assert.deepEqual(captured[2].body.input.slice(1,3),firstOutput);
  assert.deepEqual(captured[2].body.input[4],secondOutput[0]);
  const repairOutput=captured[2].body.input[5];
  assert.equal(repairOutput.call_id,'call-invalid');
  assert.equal(JSON.parse(repairOutput.output).ok,false);
});

test('returns a detached validated terminal proposal for every requested kind',async()=>{
  for(const draft of [mapDraft(),dungeonDraft(),npcDraft()]){
    const supplied=structuredClone(draft);
    const fetcher=sequentialFetcher([responseBody([functionCall(`call-${draft.kind}`,`propose_${draft.kind}`,supplied)])]);
    const result=await runCreationProposal({kind:draft.kind,brief:`Create one ${draft.kind}.`},options(fetcher));
    supplied.notes='mutated after fetch';
    assert.deepEqual(result.proposal,draft);
    assert.equal(result.catalogVersion>0,true);
  }
});

test('returns unknown-tool and wrong-kind errors to the model for repair',async()=>{
  const captured=[];
  const fetcher=sequentialFetcher([
    responseBody([functionCall('call-unknown','run_javascript',{code:'return 1'})]),
    responseBody([functionCall('call-wrong','propose_npc',npcDraft())]),
    responseBody([functionCall('call-right','propose_map',mapDraft())])
  ],captured);

  const result=await runCreationProposal({kind:'map',brief:'Create a moss hall.'},options(fetcher));

  assert.deepEqual(result.toolsUsed,['run_javascript','propose_npc','propose_map']);
  const unknown=JSON.parse(captured[1].body.input.at(-1).output);
  assert.equal(unknown.ok,false);
  assert.equal(unknown.errors[0].code,'unknown_tool');
  const wrong=JSON.parse(captured[2].body.input.at(-1).output);
  assert.equal(wrong.ok,false);
  assert.equal(wrong.errors[0].code,'requested_kind');
});

test('never treats assistant prose as a proposal',async()=>{
  const fetcher=sequentialFetcher([responseBody([assistantText(JSON.stringify(mapDraft()))])]);
  await assert.rejects(
    runCreationProposal({kind:'map',brief:'Create a hall.'},options(fetcher)),
    error=>error.status===502&&error.result===undefined
  );
});

test('rejects refused and incomplete upstream responses without a partial proposal',async()=>{
  for(const body of [responseBody([refusal()]),responseBody([],{status:'incomplete'})]){
    const fetcher=sequentialFetcher([body]);
    await assert.rejects(
      runCreationProposal({kind:'npc',brief:'Create a guide.'},options(fetcher)),
      error=>error.status===502&&error.proposal===undefined
    );
  }
});

test('rejects multiple proposal calls as ambiguous and never selects a partial draft',async()=>{
  const captured=[];
  const fetcher=async(url,request)=>{
    captured.push(JSON.parse(request.body));
    if(captured.length===1)return upstream(responseBody([
      functionCall('call-first','propose_map',mapDraft('first-hall')),
      functionCall('call-second','propose_map',mapDraft('second-hall'))
    ]));
    return upstream(responseBody([]),{ok:false,status:500});
  };

  await assert.rejects(
    runCreationProposal({kind:'map',brief:'Create one hall.'},options(fetcher)),
    error=>error.status===502&&error.proposal===undefined
  );
  const outputs=captured[1].input.filter(item=>item.type==='function_call_output');
  assert.equal(outputs.length,2);
  assert.ok(outputs.every(item=>JSON.parse(item.output).errors[0].code==='ambiguous_proposal'));
});

test('enforces six responses and twenty-four function calls',async()=>{
  let rounds=0;
  const roundFetcher=async()=>{
    rounds++;
    return upstream(responseBody([functionCall(`call-${rounds}`,'get_creation_capabilities',{})]));
  };
  await assert.rejects(
    runCreationProposal({kind:'npc',brief:'Create a guide.'},options(roundFetcher)),
    error=>error.status===502
  );
  assert.equal(rounds,6);

  let calls=0;
  const tooMany=Array.from({length:25},(_,index)=>functionCall(`call-${index}`,'get_creation_capabilities',{}));
  await assert.rejects(
    runCreationProposal({kind:'npc',brief:'Create a guide.'},options(async()=>{calls++;return upstream(responseBody(tooMany));})),
    error=>error.status===502
  );
  assert.equal(calls,1);
});

test('counts every upstream attempt against budget, including failures',async()=>{
  let remaining=1;
  const fetcher=sequentialFetcher([
    responseBody([functionCall('call-query','get_creation_capabilities',{})])
  ]);
  await assert.rejects(
    runCreationProposal({kind:'npc',brief:'Create a guide.'},options(fetcher,{consumeBudget:()=>remaining-->0})),
    error=>error.status===429
  );
  assert.equal(remaining,-1);
});

test('enforces one deadline across fetch and JSON reading even when upstream ignores abort',async()=>{
  let signal;
  const fetcher=async(url,request)=>{
    signal=request.signal;
    return upstream(null,{json:()=>new Promise(()=>{})});
  };
  const started=Date.now();
  await assert.rejects(
    runCreationProposal({kind:'npc',brief:'Create a guide.'},options(fetcher,{timeoutMs:25})),
    error=>error.status===504&&error.proposal===undefined
  );
  assert.ok(Date.now()-started<500);
  assert.equal(signal.aborted,true);
});
