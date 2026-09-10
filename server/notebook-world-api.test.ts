import {it,expect,vi} from 'vitest';
import {Readable} from 'node:stream';
import {worldApi} from './world-api';
import {WorldSimulation} from '../engine/world-simulation.js';
import {NOTEBOOK_EXAMPLES} from '../engine/notebook-core.js';

it('created notebook objects retain the existing flat narrator-view contract',async()=>{
 const simulation=new WorldSimulation();simulation.sync({player:{x:400,y:348,direction:'up'},room:'inn',actors:[],hp:280});
 const action=(op:unknown)=>simulation.apply({actor:'player',ops:[op]});
 expect(action({kind:'notebook',action:'discover'}).ok).toBe(true);
 expect(action({kind:'notebook',action:'inscribe',page:'notebook_object',content:NOTEBOOK_EXAMPLES.notebook_object,revision:0,worldId:simulation.state.id,source:'authored'}).ok).toBe(true);
 const view=simulation.view('player');expect(view.entities.some((e:{props:{notebookObject?:boolean}})=>e.props.notebookObject)).toBe(true);
 const modelResult={decision:{action:{actor:'player',intent:'Rest',ops:[{kind:'transform',entity:'player',rule:'rest'}]},explanation:'Rest'},latencyMs:1,provider:'test'};
 const runtime={info:()=>({provider:'offline',model:'test',available:false,label:'Test'}),interpret:vi.fn(async()=>modelResult),decide:vi.fn(async()=>modelResult)};
 const api=worldApi({runtime}),req=Readable.from([JSON.stringify({view,input:'Inspect the jar.'})]);
 Object.assign(req,{url:'/api/world/interpret',method:'POST',headers:{host:'localhost:5174',origin:'http://localhost:5174'},socket:{remoteAddress:'127.0.0.1'}});
 let status=200;await api(req as never,{setHeader(){},set statusCode(value:number){status=value},end(){}} as never,()=>{});
 expect(status).toBe(200);expect(runtime.interpret).toHaveBeenCalledOnce();
});
