import {NOTEBOOK_ID,KINDLING_ID,OBJECT_KINDS,NOTEBOOK_LIMITS,validateNotebookContent} from './notebook-core.js';
const copy=v=>structuredClone(v);
const fail=message=>{throw new Error(message);};
const objectDefinition=e=>validateNotebookContent('notebook_object',{name:e.name,description:e.description,kind:e.props.notebookKind});
export function initializeNotebook(state){
 const fixture=(id,name,x,y,props,description)=>({id,name,kind:'fixture',icon:id,description,location:{kind:'ground',room:'inn',x,y},props:{portable:false,...props}});
 state.entities[NOTEBOOK_ID]??=fixture(NOTEBOOK_ID,'Unfinished notebook',381,304,{notebookBook:true},'An unfinished notebook. The ink seems to move when nobody is watching.');
 state.entities[KINDLING_ID]??=fixture(KINDLING_ID,'Kindling tray',426,312,{notebookTarget:true,onFire:true,wet:false},'A shallow tray of burning kindling. The notebook lies beside it.');
 const old=state.notebook;state.notebook={version:1,discovered:old?.discovered===true,revision:Number.isSafeInteger(old?.revision)&&old.revision>=0?old.revision:0,nextId:Number.isSafeInteger(old?.nextId)&&old.nextId>0?old.nextId:1,laws:[],selected:null,rememberedQuench:null};
 for(const law of (Array.isArray(old?.laws)?old.laws:[]).slice(0,4))try{if(typeof law.id!=='string'||!/^notebook-law-\d+$/.test(law.id)||state.notebook.laws.some(l=>l.id===law.id))continue;state.notebook.laws.push({id:law.id,definition:validateNotebookContent('notebook_law',law.definition),enabled:law.enabled!==false,source:law.source==='ai'?'ai':'authored'});}catch{}
 for(const e of Object.values(state.entities).filter(e=>e.props?.notebookObject))try{if(e.props.notebookDefinition){e.props.notebookKind=validateNotebookContent('notebook_object',e.props.notebookDefinition).kind;delete e.props.notebookDefinition;}objectDefinition(e);}catch{e.location={kind:'removed'};}
 if(state.entities[old?.selected]?.props?.notebookObject&&state.entities[old.selected].location.kind!=='removed')state.notebook.selected=old.selected;
 if(state.events.some(e=>e.id===old?.rememberedQuench&&e.kind==='notebook_status_changed'&&e.data?.status==='onFire'&&!e.data.on))state.notebook.rememberedQuench=old.rememberedQuench;
 const target=state.entities[KINDLING_ID];target.props.onFire=target.props.onFire===true;target.props.wet=target.props.wet===true;
 if(target.props.wet)target.props.onFire=false;
}
export function notebookSnapshot(simulation,jobs=[]){
 const n=simulation.state.notebook,target=simulation.entity(KINDLING_ID);
 return {...copy(n),objects:Object.values(simulation.state.entities).filter(e=>e.props.notebookObject&&e.location.kind!=='removed'&&simulation.available(e.id,'player')).map(e=>({id:e.id,definition:objectDefinition(e),source:e.props.notebookSource||'authored',location:copy(e.location)})),target:{id:target.id,name:target.name,tags:['wood','flammable'],statuses:['onFire','wet'].filter(s=>target.props[s]===true)},proposals:jobs.filter(j=>j.kind.startsWith('notebook_')&&j.proposal).map(j=>({id:j.id,kind:j.kind,content:copy(j.proposal),revision:j.notebook.revision,status:j.notebookStatus||'pending'}))};
}
export function notebookWorldContext(simulation){const state=simulation.state;return {worldId:state.id,revision:state.notebook.revision,room:'inn',target:{id:KINDLING_ID},objectKinds:Object.keys(OBJECT_KINDS),subjectTags:['liquid','heatSource','stone'],statuses:['onFire','wet'],trigger:'Used'};}
export function applyNotebookOperation(simulation,actor,op){
 const s=simulation.state,n=s.notebook;
 if(actor.id!=='player')fail('Only the player can inscribe this notebook.');
 if(!['discover','inscribe','use','select','toggle','erase'].includes(op.action))fail('Unsupported notebook action.');
 const fields={discover:['kind','action'],inscribe:['kind','action','page','content','revision','worldId','source'],use:['kind','action','entity','target'],select:['kind','action','entity'],toggle:['kind','action','entity'],erase:['kind','action','entity']}[op.action];
 if(Object.keys(op).some(k=>!fields.includes(k)))fail('Unsupported notebook operation fields.');
 if(simulation.position('player')?.room!=='inn')fail('The notebook is in the inn.');
 simulation.reachable('player',NOTEBOOK_ID,95);
 if(op.action==='discover'){
  if(!n.discovered){n.discovered=true;simulation.emit('player','notebook_discovered','Found an unfinished notebook beside the kindling.',{subject:NOTEBOOK_ID});}return;
 }
 if(!n.discovered)fail('Read the notebook first.');
 if(op.action==='inscribe'){
  if(op.worldId!==s.id||op.revision!==n.revision)fail('This draft predates a notebook change. Write a fresh page.');
  const definition=validateNotebookContent(op.page,op.content),source=op.source==='ai'?'ai':'authored';
  if(op.page==='notebook_object'){
   if(Object.values(s.entities).filter(e=>e.props.notebookObject&&e.location.kind!=='removed').length>=NOTEBOOK_LIMITS.objects)fail('Four created objects already exist. Erase one before creating another.');
   const from=simulation.position('player'),places=[[24,0],[-24,0],[0,24],[0,-24]].map(([dx,dy])=>({...from,x:from.x+dx,y:from.y+dy})),place=places.find(p=>simulation.clear(from,p));
   if(!place)fail('There is no clear ground nearby for that object.');
   const id=`notebook-object-${n.nextId++}`;if(Object.hasOwn(s.entities,id))fail('That page identity already exists.');
   s.entities[id]={id,name:definition.name,description:definition.description,kind:'item',icon:definition.kind,location:{kind:'ground',...place},props:{portable:true,size:1,notebookObject:true,notebookKind:definition.kind,notebookSource:source}};n.selected=id;
   simulation.emit('player','notebook_object_created',`Created ${definition.name} from a notebook page.`,{subject:id,data:{definition,source},location:place});
  }else{
   if(n.laws.length>=NOTEBOOK_LIMITS.laws)fail('Four laws are already written. Erase one before writing another.');
   const id=`notebook-law-${n.nextId++}`;n.laws.push({id,definition,enabled:true,source});simulation.emit('player','notebook_law_written',`Inscribed ${definition.name}.`,{subject:id,data:{definition,source}});
  }
  n.revision++;return;
 }
 if(op.action==='use'){
  const object=simulation.entity(op.entity),target=simulation.entity(op.target);if(!object.props.notebookObject||target.id!==KINDLING_ID)fail('Choose a created object and the kindling tray.');
  simulation.reachable('player',object.id);simulation.reachable('player',target.id);
  const tags=OBJECT_KINDS[objectDefinition(object).kind].tags;
  const used=simulation.emit('player','notebook_object_used',`Used ${object.name} on the kindling.`,{subject:object.id,target:target.id});
  const set=(status,on,lawId)=>{if(target.props[status]===on||status==='onFire'&&on&&target.props.wet)return;target.props[status]=on;const event=simulation.emit('player','notebook_status_changed',`${status==='onFire'?'Fire':'Wetness'} ${on?'appeared on':'cleared from'} the kindling.`,{subject:target.id,target:target.id,data:{status,on,lawId,causalEventId:used.id}});if(status==='onFire'&&!on)n.rememberedQuench=event.id;};
  for(const law of n.laws.slice(0,4)){const d=validateNotebookContent('notebook_law',law.definition);if(!law.enabled||!tags.includes(d.subjectTag))continue;const on=d.effect.value==='set';if(d.effect.status==='wet'&&on)set('onFire',false,law.id);set(d.effect.status,on,law.id);}
  n.revision++;return;
 }
 const object=s.entities[op.entity]?.props?.notebookObject?s.entities[op.entity]:null,law=n.laws.find(l=>l.id===op.entity);
 if(op.action==='select'&&object&&object.location.kind!=='removed'){simulation.reachable('player',object.id);n.selected=object.id;return;}
 if(op.action==='toggle'&&law)law.enabled=!law.enabled;
 else if(op.action==='erase'&&(law||object)){
  if(object){simulation.reachable('player',object.id);object.location={kind:'removed'};if(n.selected===object.id)n.selected=null;}
  if(law)n.laws=n.laws.filter(l=>l.id!==law.id);
 }else fail('That page is no longer available.');
 n.revision++;simulation.emit('player','notebook_page_changed',`${op.action==='erase'?'Erased':'Changed'} a notebook page.`,{subject:op.entity,data:{operation:op.action}});
}
