import {DungeonRooms} from './dungeon-rooms.js';
import {dungeonMaster} from './dungeon-master.js';
export function dungeonApi(env,{fetcher=fetch,dm,rooms}={}){
 const table=rooms||new DungeonRooms(dm||dungeonMaster(env,fetcher));
 return async(req,res,next)=>{
  const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/dungeon'))return next();
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'Origin not allowed.'});
   if(url.pathname==='/api/dungeon/status'&&req.method==='GET')return send(200,{configured:table.dm.configured,capacity:4});
   let input={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4000)return send(413,{error:'Request too large.'})}try{input=JSON.parse(raw)}catch{return send(400,{error:'Invalid request.'})}if(!input||typeof input!=='object'||Array.isArray(input))return send(400,{error:'Invalid request.'});}
   if(url.pathname==='/api/dungeon/rooms'&&req.method==='POST')return send(201,table.create(input));
   const route=url.pathname.match(/^\/api\/dungeon\/rooms\/([A-Za-z0-9]{6})(?:\/(join|start|action|chat|leave))?$/);if(!route)return send(404,{error:'Unknown room endpoint.'});
   const [,code,action]=route;
   if(action==='join'&&req.method==='POST')return send(200,table.join(code,input));
   const token=(req.headers.authorization||'').replace(/^Bearer /,'');const {r,p}=table.authorize(code,token);
   if(!action&&req.method==='GET')return send(200,table.snapshot(r,p));
   if(req.method!=='POST')return send(405,{error:'Use POST for this room action.'});
   if(action==='start')table.begin(r,p);
   else if(action==='action')table.act(r,p,input);
   else if(action==='chat'){
    const text=String(input.text||'').trim();if(!text||text.length>300)return send(400,{error:'Chat messages need 1–300 characters.'});
    if(table.clock()-(p.lastChat||0)<750)return send(429,{error:'Give your companions a moment to respond.'});p.lastChat=table.clock();table.log(r,p.name,text,'chat');table.touch(r);
   }else if(action==='leave'){table.leave(r,p);return send(200,{left:true})}else return send(404,{error:'Unknown action.'});
   return send(200,table.snapshot(r,p));
  }catch(e){return send(e.status||500,{error:e.status?e.message:'The table could not process that request. Try again.'})}
 };
}
