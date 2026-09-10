import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';
import {dungeonApi} from './dungeon-api.js';import {DungeonRooms} from './dungeon-rooms.js';
test('independent HTTP clients join, chat, reconnect and enforce authorization',async()=>{
 const rooms=new DungeonRooms({configured:false});const api=dungeonApi({}, {rooms});const server=createServer((req,res)=>api(req,res,()=>{res.writeHead(404);res.end()}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/api/dungeon`;
 const call=async(path,body,token)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json()}};
 try{const host=(await call('/rooms',{name:'One',heroClass:'Warrior'})).data;const guest=(await call(`/rooms/${host.code}/join`,{name:'Two',heroClass:'Healer'})).data;
  assert.equal((await call(`/rooms/${host.code}`)).status,401);await call(`/rooms/${host.code}/chat`,{text:'Ready for the dragon.'},guest.token);const a=(await call(`/rooms/${host.code}`,null,host.token)).data,b=(await call(`/rooms/${host.code}`,null,guest.token)).data;assert.equal(a.players.length,2);assert.equal(a.code,b.code);assert.equal(a.log.at(-1).text,b.log.at(-1).text);assert.notEqual(a.you,b.you);assert.ok(!JSON.stringify(a).includes(guest.token));
  assert.equal((await call(`/rooms/${host.code}/start`,{},guest.token)).status,403);assert.equal((await call(`/rooms/${host.code}/leave`,{},guest.token)).status,200);assert.equal((await call(`/rooms/${host.code}`,null,guest.token)).status,401);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});
