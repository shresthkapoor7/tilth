import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {generationApi} from './generation-api.js';
import {NOTEBOOK_EXAMPLES as EX} from '../engine/notebook-core.js';
async function request(api,body){const req=Readable.from([JSON.stringify(body)]);Object.assign(req,{url:'/api/generation',method:'POST',headers:{host:'localhost:5173',origin:'http://localhost:5173'}});let status,data;await api(req,{set statusCode(n){status=n},setHeader(){},end(value){data=JSON.parse(value)}},()=>{});return{status,data};}
const input={id:'page-1',kind:'notebook_object',brief:'A rainwater jar',events:[{id:'discovery',type:'notebook_discovered',target:'inn-notebook',label:'Found the notebook'}],notebook:{worldId:'test-world',revision:0,room:'inn',target:{id:'inn-kindling'}},profile:{}};
test('notebook uses the existing API and strict schema with supported context',async()=>{
 let payload,calls=0;const api=generationApi({OPENAI_API_KEY:'test-only',OPENAI_MODEL:'test-model'},async(url,options)=>{calls++;payload=JSON.parse(options.body);return{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(EX.notebook_object)}]}]})}});
 const result=await request(api,input);assert.equal(result.status,200);assert.equal(payload.text.format.name,'game_notebook_object');assert.ok(payload.instructions.includes('proposal only'));assert.equal(JSON.parse(payload.input).notebook.trigger,'Used');
 assert.equal((await request(api,input)).status,200);assert.equal(calls,1);assert.equal((await request(api,{...input,brief:'Different object'})).status,409);
});
test('malformed notebook requests and executable returned effects never become content',async()=>{
 let calls=0;const api=generationApi({OPENAI_API_KEY:'test-only',OPENAI_MODEL:'test-model'},async()=>{calls++;return{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({...EX.notebook_law,effect:{op:'execute',code:'alert(1)'}})}]}]})}});
 assert.equal((await request(api,{...input,brief:''})).status,400);assert.equal((await request(api,{...input,notebook:{...input.notebook,room:'smith'}})).status,400);assert.equal(calls,0);
 const result=await request(api,{...input,kind:'notebook_law'});assert.ok(result.status>=400);assert.equal(result.data.content,undefined);
});
