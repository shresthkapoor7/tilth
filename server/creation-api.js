import {createHash} from 'node:crypto';
import {CATALOG_VERSION,getCreationCapabilities} from '../engine/creation-proposals.js';
import {getCreationTools} from './creation-tools.js';
import {CreationRunnerError,runCreationProposal} from './creation-runner.js';

const BODY_LIMIT=24*1024;
const REQUEST_KEYS=['brief','id','kind'];

export function createGenerationControl(env={}){
  const limit=Math.max(1,Math.min(100,Number(env.OPENAI_MAX_GENERATIONS)||20));
  let busy=false,requests=0;
  return {
    begin(){
      if(busy)return 'busy';
      if(requests>=limit)return 'limit';
      busy=true;return 'ok';
    },
    consume(){if(requests>=limit)return false;requests++;return true;},
    end(){busy=false;}
  };
}

function validInput(input){
  return Boolean(input&&typeof input==='object'&&!Array.isArray(input)
    &&Object.keys(input).sort().join(',')===REQUEST_KEYS.join(',')
    &&typeof input.id==='string'&&input.id.length>=1&&input.id.length<=100
    &&['map','dungeon','npc'].includes(input.kind)
    &&typeof input.brief==='string'&&input.brief.trim().length>0&&input.brief.length<=3000);
}

async function readJson(req){
  const chunks=[];let size=0;
  for await(const chunk of req){
    const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    size+=bytes.length;
    if(size>BODY_LIMIT)throw Object.assign(new Error('oversize'),{status:413});
    chunks.push(bytes);
  }
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{throw Object.assign(new Error('malformed'),{status:400});}
}

function originAllowed(req){
  const origin=req.headers?.origin;
  if(!origin)return true;
  try{return new URL(origin).host===req.headers?.host;}catch{return false;}
}

const digest=input=>createHash('sha256').update(JSON.stringify({kind:input.kind,brief:input.brief,catalogVersion:CATALOG_VERSION})).digest('hex');

export function creationApi(env={},fetcher=fetch,control=createGenerationControl(env)){
  const configured=Boolean(env.OPENAI_API_KEY&&env.OPENAI_MODEL);
  const cache=new Map();
  return async(req,res,next)=>{
    const path=req.url?.split('?')[0];
    if(path!=='/api/creation'&&!path?.startsWith('/api/creation/'))return next();
    const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    if(path==='/api/creation/tools'){
      if(req.method!=='GET')return send(405,{error:'Unsupported creation request.'});
      return send(200,{catalogVersion:CATALOG_VERSION,capabilities:getCreationCapabilities(),tools:getCreationTools()});
    }
    if(path!=='/api/creation/propose')return send(404,{error:'Creation route not found.'});
    if(req.method!=='POST')return send(405,{error:'Unsupported creation request.'});
    if(!originAllowed(req))return send(403,{error:'Origin not allowed.'});
    let input;
    try{input=await readJson(req);}catch(error){return send(error.status===413?413:400,{error:error.status===413?'Creation request is too large.':'Invalid creation request.'});}
    if(!validInput(input))return send(400,{error:'Invalid creation request.'});
    const requestDigest=digest(input);
    const prior=cache.get(input.id);
    if(prior){
      if(prior.digest!==requestDigest)return send(409,{error:'This creation ID belongs to a different request.'});
      return send(200,structuredClone(prior.result));
    }
    if(!configured)return send(503,{error:'AI creation is not configured on this server.'});
    const availability=control.begin();
    if(availability==='busy')return send(429,{error:'Another generation is running. Retry shortly.'});
    if(availability==='limit')return send(429,{error:'The local server generation budget has been reached.'});
    try{
      const result=await runCreationProposal({kind:input.kind,brief:input.brief},{apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL,fetcher,consumeBudget:()=>control.consume()});
      const stored=structuredClone(result);
      if(cache.size>=100)cache.delete(cache.keys().next().value);
      cache.set(input.id,{digest:requestDigest,result:stored});
      return send(200,structuredClone(stored));
    }catch(error){
      if(error instanceof CreationRunnerError)return send(error.status,{error:error.message});
      return send(502,{error:'Creation could not be completed; no draft was produced.'});
    }finally{control.end();}
  };
}
