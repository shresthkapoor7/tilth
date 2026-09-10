import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {creationApi} from './creation-api.js';
import {mapDraft} from '../test-support/creation-fixtures.js';

const completeProposal=proposal=>({
  id:'resp-test',object:'response',created_at:1,status:'completed',error:null,incomplete_details:null,
  instructions:null,max_output_tokens:12000,model:'test-model',
  output:[{type:'function_call',id:'fc-final',call_id:'call-final',name:`propose_${proposal.kind}`,arguments:JSON.stringify(proposal),status:'completed'}],
  parallel_tool_calls:false,previous_response_id:null,store:false,temperature:1,text:{format:{type:'text'}},
  tool_choice:'auto',tools:[],top_p:1,
  usage:{input_tokens:1,input_tokens_details:{cached_tokens:0},output_tokens:1,output_tokens_details:{reasoning_tokens:0},total_tokens:2}
});
const request=async(api,{body,url='/api/creation/propose',method='POST',origin='http://localhost:5173',host='localhost:5173',raw}={})=>{
  const chunks=raw===undefined?(body===undefined?[]:[JSON.stringify(body)]):[raw];
  const req=Readable.from(chunks);Object.assign(req,{url,method,headers:{host,...(origin===undefined?{}:{origin})}});
  let data,status,next=false;
  const res={set statusCode(value){status=value},setHeader(){},end(value){data=JSON.parse(value)}};
  await api(req,res,()=>{next=true});
  return{status,data,next};
};
const configured={OPENAI_API_KEY:'server-secret',OPENAI_MODEL:'test-model',OPENAI_MAX_GENERATIONS:'100'};
const successfulFetcher=(counter={count:0})=>async()=>{
  counter.count++;
  return Response.json(completeProposal(mapDraft()));
};

test('lists creation tools and capabilities without credentials or an upstream call',async()=>{
  let calls=0;
  const result=await request(creationApi({},async()=>{calls++;}),{url:'/api/creation/tools',method:'GET'});
  assert.equal(result.status,200);
  assert.equal(result.data.catalogVersion>0,true);
  assert.equal(result.data.capabilities.output,'reviewable drafts only; no live world mutation');
  assert.ok(result.data.tools.some(tool=>tool.name==='propose_map'));
  result.data.tools[0].name='corrupted';
  const again=await request(creationApi({}),{url:'/api/creation/tools',method:'GET'});
  assert.equal(again.data.tools.some(tool=>tool.name==='corrupted'),false);
  assert.equal(calls,0);
});

test('rejects unsupported methods and unknown creation paths without model calls',async()=>{
  let calls=0;const api=creationApi(configured,async()=>{calls++;});
  assert.equal((await request(api,{url:'/api/creation/tools',method:'POST',body:{}})).status,405);
  assert.equal((await request(api,{url:'/api/creation/propose',method:'GET'})).status,405);
  assert.equal((await request(api,{url:'/api/creation/missing',method:'GET'})).status,404);
  assert.equal((await request(api,{url:'/api/unrelated',method:'GET'})).next,true);
  assert.equal(calls,0);
});

test('validates same-host origins and treats malformed origins as forbidden',async()=>{
  const api=creationApi(configured,successfulFetcher());
  for(const origin of ['https://attacker.example','not a valid origin']){
    const result=await request(api,{body:{id:'origin',kind:'map',brief:'Create a hall.'},origin});
    assert.equal(result.status,403);
    assert.equal(result.data.proposal,undefined);
  }
});

test('rejects malformed, oversized, and non-exact creation requests',async()=>{
  const api=creationApi(configured,successfulFetcher());
  assert.equal((await request(api,{raw:'{broken'})).status,400);
  assert.equal((await request(api,{raw:'x'.repeat(24*1024+1)})).status,413);
  for(const body of [
    {},{id:'',kind:'map',brief:'Valid brief.'},{id:'x'.repeat(101),kind:'map',brief:'Valid brief.'},
    {id:'one',kind:'quest',brief:'Valid brief.'},{id:'one',kind:'map',brief:'   '},
    {id:'one',kind:'map',brief:'x'.repeat(3001)},{id:'one',kind:'map',brief:'Valid brief.',extra:true}
  ])assert.equal((await request(api,{body})).status,400);
});

test('returns 503 for valid proposals when model credentials are absent',async()=>{
  let calls=0;
  const result=await request(creationApi({},async()=>{calls++;}),{body:{id:'one',kind:'map',brief:'Create a hall.'}});
  assert.equal(result.status,503);
  assert.equal(result.data.proposal,undefined);
  assert.equal(calls,0);
});

test('caches successful requests without upstream charge and rejects conflicting ID reuse',async()=>{
  const counter={count:0};const api=creationApi(configured,successfulFetcher(counter));
  const body={id:'one',kind:'map',brief:'Create a hall.'};
  const first=await request(api,{body});
  assert.equal(first.status,200);
  first.data.proposal.notes='caller mutation';
  const cached=await request(api,{body});
  assert.equal(cached.status,200);
  assert.equal(cached.data.proposal.notes,mapDraft().notes);
  assert.equal(counter.count,1);
  const conflict=await request(api,{body:{...body,brief:'Create a different hall.'}});
  assert.equal(conflict.status,409);
  assert.equal(conflict.data.proposal,undefined);
  assert.equal(counter.count,1);
});

test('does not cache failures or expose partial proposals',async()=>{
  let calls=0;
  const api=creationApi(configured,async()=>{
    calls++;
    if(calls===1)return new Response('temporary failure',{status:500});
    return Response.json(completeProposal(mapDraft()));
  });
  const body={id:'retry',kind:'map',brief:'Create a hall.'};
  const failed=await request(api,{body});
  assert.equal(failed.status,502);
  assert.equal(failed.data.proposal,undefined);
  const retried=await request(api,{body});
  assert.equal(retried.status,200);
  assert.equal(calls,2);
});
