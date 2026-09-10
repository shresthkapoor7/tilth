import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {generationApi} from './generation-api.js';
async function request(api,body,url='/api/generation',method='POST'){
 const req=Readable.from(body?[JSON.stringify(body)]:[]);Object.assign(req,{url,method,headers:{host:'localhost:5173',origin:'http://localhost:5173'}});
 let data,status;const res={set statusCode(n){status=n},setHeader(){},end(v){data=JSON.parse(v)}};await api(req,res,()=>{});return{status,data};
}
const input={id:'one',kind:'journal',events:[{id:'e1',type:'room_entered',target:'inn',label:'Visited inn'}],profile:{},pastQuests:[]};
const mapProposal={kind:'map',notes:'An empty room.',npcs:[],map:{id:'shared-room',name:'Shared Room',description:'A room.',theme:'Stone',width:8,height:8,tiles:['########','#......#','#......#','#......#','#......#','#......#','#......#','########'],entrance:{x:1,y:1},exits:[{id:'door',label:'Door',x:6,y:6}],props:[],npcs:[]}};
const creationResponse=()=>({id:'resp-create',object:'response',created_at:1,status:'completed',error:null,incomplete_details:null,instructions:null,max_output_tokens:12000,model:'test',output:[{type:'function_call',id:'fc-create',call_id:'call-create',name:'propose_map',arguments:JSON.stringify(mapProposal),status:'completed'}],parallel_tool_calls:false,previous_response_id:null,store:false,temperature:1,text:{format:{type:'text'}},tool_choice:'auto',tools:[],top_p:1,usage:{input_tokens:1,input_tokens_details:{cached_tokens:0},output_tokens:1,output_tokens_details:{reasoning_tokens:0},total_tokens:2}});
test('no key means no upstream call',async()=>{let count=0;const api=generationApi({},()=>count++);assert.equal((await request(api,input)).status,503);assert.equal(count,0)});
test('valid responses are cached and ID reuse with different evidence is rejected',async()=>{let count=0;const api=generationApi({OPENAI_API_KEY:'test-only',OPENAI_MODEL:'test-model'},async()=>{count++;return{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({title:'Visit',summary:'Entered the inn.',sourceEventIds:['e1']})}]}]})}});assert.equal((await request(api,input)).status,200);assert.equal((await request(api,input)).status,200);assert.equal(count,1);assert.equal((await request(api,{...input,events:[{...input.events[0],label:'Different'}]})).status,409)});
test('refusals and incomplete outputs never become content',async()=>{for(const result of [{status:'incomplete'},{status:'completed',output:[{content:[{type:'refusal'}]}]}]){const api=generationApi({OPENAI_API_KEY:'test-only',OPENAI_MODEL:'test-model'},async()=>({ok:true,json:async()=>result}));const r=await request(api,input);assert.ok(r.status>=400);assert.equal(r.data.content,undefined)}});
test('quest requests include objective constraints and repeated API outputs are rejected',async()=>{let captured;const api=generationApi({OPENAI_API_KEY:'test-only',OPENAI_MODEL:'test-model'},async(url,options)=>{captured=JSON.parse(JSON.parse(options.body).input);return{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({title:'Different title',description:'Same objective',sourceEventIds:['e1'],objectives:[{type:'visit_room',target:'home',description:'Go home'}]})}]}]})}});const r=await request(api,{...input,kind:'quest',pastQuests:[{title:'Previous',objectives:[{type:'visit_room',target:'home'}]}]});assert.equal(r.status,422);assert.equal(captured.questConstraints.allowedObjectives.some(o=>o.target==='home'),false)});
test('character description, random, and name requests use their own contracts',async()=>{const {DEFAULT_CHARACTER}=await import('../content/characters.js');for(const mode of ['description','random','name']){let context;const content=mode==='name'?{name:'Sable'}:{...DEFAULT_CHARACTER,name:'Sable'};const api=generationApi({OPENAI_API_KEY:'test-only',OPENAI_MODEL:'test-model'},async(url,options)=>{const payload=JSON.parse(options.body);context=JSON.parse(payload.input);return{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(content)}]}]})}});const r=await request(api,{id:mode,kind:mode==='name'?'name':'character',mode,brief:'A quiet traveler with a bow',events:[],profile:{}});assert.equal(r.status,200);assert.equal(context.mode,mode);assert.equal(r.data.content.name,'Sable')}});
test('reaction route grounds the speaker in a recorded hit and supplies its personality',async()=>{let context;const api=generationApi({OPENAI_API_KEY:'test',OPENAI_MODEL:'test'},async(url,options)=>{context=JSON.parse(JSON.parse(options.body).input);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({speaker:'rowan',line:'Back off!',sourceEventIds:['hit']})}]}]})});const body={id:'reaction',kind:'reaction',events:[{id:'hit',type:'combat_hit',target:'rowan',label:'Struck Rowan outdoors'}]};const result=await request(api,body);assert.equal(result.status,200);assert.equal(context.speaker.id,'rowan');assert.match(context.scene,/Outdoors/);assert.equal((await request(api,{...body,id:'invalid',events:[{...body.events[0],target:'invented'}]})).status,400)});

test('creation and legacy generation consume the same upstream-call budget',async()=>{
 const api=generationApi({OPENAI_API_KEY:'test',OPENAI_MODEL:'test',OPENAI_MAX_GENERATIONS:'1'},async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({title:'Visit',summary:'Entered the inn.',sourceEventIds:['e1']})}]}]}));
 assert.equal((await request(api,input)).status,200);
 const creation=await request(api,{id:'create-one',kind:'map',brief:'Create a room.'},'/api/creation/propose');
 assert.equal(creation.status,429);
 assert.equal(creation.data.proposal,undefined);
});

test('busy state spans generation and creation route families',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve});let started;
 const began=new Promise(resolve=>{started=resolve});
 const api=generationApi({OPENAI_API_KEY:'test',OPENAI_MODEL:'test'},async(url,options)=>{
  const payload=JSON.parse(options.body);
  if(payload.max_output_tokens===12000){started();await pending;return Response.json(creationResponse());}
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({title:'Visit',summary:'Entered the inn.',sourceEventIds:['e1']})}]}]});
 });
 const creating=request(api,{id:'create-busy',kind:'map',brief:'Create a room.'},'/api/creation/propose');
 await began;
 assert.equal((await request(api,{...input,id:'legacy-while-busy'})).status,429);
 release();assert.equal((await creating).status,200);
});
