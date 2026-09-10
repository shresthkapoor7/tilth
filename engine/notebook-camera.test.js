import test from 'node:test';
import assert from 'node:assert/strict';
import {canvasViewport,clientToWorld,entitiesInViewport} from './world-viewport.js';
const nearly=(a,b)=>assert.ok(Math.abs(a-b)<.0001,`${a} != ${b}`);
test('doubled backing pixels preserve native world selection and visible objects',()=>{
 const args={bounds:{left:100,top:50,width:800,height:600},position:{x:400,y:335},viewport:{width:1280,height:900}},native=canvasViewport(args),retina=canvasViewport({...args,width:1600,height:1200,camera:{scale:2,x:0,y:0,width:800,height:600}});
 assert.deepEqual(retina,native);assert.deepEqual(clientToWorld({x:481,y:354},retina),{x:381,y:304});
});
test('inn zoom inverse maps a drawn notebook and excludes objects outside the camera',()=>{
 const view=canvasViewport({bounds:{left:100,top:50,width:800,height:600},width:1600,height:1200,position:{x:400,y:348},viewport:{width:1280,height:900},camera:{scale:3,x:-400,y:-240,width:800,height:600}});
 const world={x:381,y:304},screen={x:100+(world.x*3-400)*.5,y:50+(world.y*3-240)*.5},click=clientToWorld(screen,view);nearly(click.x,world.x);nearly(click.y,world.y);
 const entities=[{id:'book',location:{kind:'ground',room:'inn',...world}},{id:'offscreen',location:{kind:'ground',room:'inn',x:100,y:100}}];assert.deepEqual(entitiesInViewport(entities,view,'inn').map(e=>e.id),['book']);
});
test('letterboxed phone inn uses centered contain sizing and rejects the empty bars',()=>{
 const view=canvasViewport({bounds:{left:0,top:0,width:390,height:700},width:1600,height:1200,position:{x:440,y:390},viewport:{width:390,height:844},camera:{scale:3,x:-400,y:-240,width:800,height:600,fit:'contain',anchor:{x:.5,y:.5}}});
 const middle=clientToWorld({x:195,y:350},view);nearly(middle.x,400);nearly(middle.y,280);
 assert.equal(clientToWorld({x:391,y:350},view),null);
 assert.equal(clientToWorld({x:195,y:100},view),null);assert.equal(clientToWorld({x:195,y:600},view),null);
 const book=clientToWorld({x:(381*3-400)*.24375,y:203.75+(304*3-240)*.24375},view);nearly(book.x,381);nearly(book.y,304);
});
