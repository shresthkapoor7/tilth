import {notebookRuntimeFacade} from './notebook-runtime.js';
import {NOTEBOOK_EXAMPLES,NOTEBOOK_LIMITS,notebookReachable,OBJECT_KINDS} from './notebook-core.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,extra='')=>`<button type="button" class="outline" data-notebook-action="${action}" ${extra}>${esc(label)}</button>`;
const tags={liquid:'a liquid',heatSource:'a heat source',stone:'a stone'};
export function describeNotebookLaw(definition){const e=definition.effect;return `When ${tags[definition.subjectTag]} is used on the kindling, ${e.value==='clear'?'clear':'set'} ${e.status==='onFire'?'fire':'wetness'}.`;}

export function createNotebookController({runtime:gameRuntime,simulation,controller,getScene,dialogue,redraw,busy=()=>false,onPause=()=>{}}){
 const runtime=notebookRuntimeFacade(gameRuntime,simulation,controller);
 let page='notebook_object',providerStatus='checking',message='';
 const dialog=document.createElement('dialog');dialog.id='creationNotebook';dialog.setAttribute('aria-labelledby','notebookTitle');
 dialog.innerHTML=`<div class="notebook-heading"><div><p class="eyebrow">THE INN TABLE</p><h2 id="notebookTitle">An unfinished notebook</h2></div><button type="button" class="outline" id="closeNotebook" aria-label="Close notebook">Close ×</button></div>
 <div class="notebook-tabs" role="group" aria-label="Notebook pages"><button type="button" data-page="notebook_object" aria-pressed="true">Create an object</button><button type="button" data-page="notebook_law" aria-pressed="false">Write a law</button></div>
 <div class="notebook-columns"><section><form id="notebookForm"><label for="notebookBrief" id="notebookBriefLabel">Describe an object</label><textarea id="notebookBrief" maxlength="600" rows="3" placeholder="A small jar of rainwater"></textarea><p id="notebookSupported" class="modal-note"></p><button type="submit" class="primary" id="notebookGenerate">Draft with AI</button></form><details class="notebook-example"><summary>A handwritten page</summary><p id="notebookExampleText"></p><p class="modal-note">Authored example · no AI request.</p><button type="button" class="outline" id="notebookExample">Copy this page</button></details><p id="notebookMessage" role="status"></p><div id="notebookDrafts"></div></section><section><h3>Created objects</h3><div id="notebookObjects"></div><h3>Written laws</h3><div id="notebookLaws"></div><p id="notebookTarget"></p><button type="button" class="primary" id="notebookUse">Use selected object on kindling</button></section></div>`;
 document.body.append(dialog);
 const controls=document.createElement('div');controls.id='notebookActions';controls.hidden=true;
 controls.innerHTML='<button type="button" class="outline" id="readNotebook">Read notebook <kbd>N</kbd></button><button type="button" class="outline" id="useNotebookObject">Use object <kbd>G</kbd></button>';
 document.body.append(controls);
 const find=id=>dialog.querySelector(`#${id}`);
 const fail=error=>{message=error.message||String(error);render();};
 function act(fn){try{message='';fn();render();redraw();}catch(error){fail(error);}}
 function render(){
  const state=runtime.state.notebook;
  find('notebookBriefLabel').textContent=page==='notebook_object'?'Describe an object':'Describe a law';
  find('notebookSupported').textContent=page==='notebook_object'?'Forms on this page: water vessel, torch, stone.':'A use-triggered law can set or clear fire or wetness on flammable kindling. Wet kindling cannot ignite.';
  find('notebookExampleText').textContent=page==='notebook_object'?`${NOTEBOOK_EXAMPLES[page].name} — ${NOTEBOOK_EXAMPLES[page].description}`:describeNotebookLaw(NOTEBOOK_EXAMPLES[page]);
  dialog.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===page)));
  const pending=runtime.state.jobs.filter(j=>j.kind.startsWith('notebook_')&&['queued','running','failed'].includes(j.status));
  find('notebookGenerate').disabled=providerStatus!=='ready'||pending.length>0;
  const provider=providerStatus==='ready'?'':providerStatus==='unconfigured'?'AI is not configured. The handwritten page is available.':providerStatus==='offline'?'AI is offline. The handwritten page is available.':'Checking the generation service…';
  find('notebookMessage').textContent=message||pending.map(j=>`${j.status==='running'?'Writing a draft':j.status==='queued'?'Page queued':'Draft failed'}${j.error?`: ${j.error}`:''}`).join(' · ')||provider;
  find('notebookDrafts').innerHTML=pending.filter(j=>j.status!=='running').map(j=>`<div class="notebook-draft">${j.status==='failed'?button('Retry draft','retry',`data-id="${esc(j.id)}"`):''}${button('Dismiss request','dismiss',`data-id="${esc(j.id)}"`)}</div>`).join('')+state.proposals.filter(p=>p.status==='pending').map(p=>`<article class="notebook-draft"><p class="eyebrow">AI DRAFT · NOT INSCRIBED</p><h3>${esc(p.content.name)}</h3><p>${esc(p.kind==='notebook_object'?`${OBJECT_KINDS[p.content.kind].label} — ${p.content.description}`:describeNotebookLaw(p.content))}</p>${p.revision!==state.revision?'<p>This draft predates a notebook change. Dismiss it and write a fresh one.</p>':button('Inscribe draft','accept',`data-id="${esc(p.id)}"`)}${button('Dismiss','dismiss',`data-id="${esc(p.id)}"`)}</article>`).join('');
  find('notebookObjects').innerHTML=state.objects.length?state.objects.map(o=>`<article class="notebook-entry"><b>${esc(o.definition.name)}</b><span>${esc(OBJECT_KINDS[o.definition.kind].label)} · ${o.source==='ai'?'AI page':'handwritten'} · ${o.location?.kind==='held'?'carrying':o.location?.kind==='contained'?'in a container':'on the ground'}</span>${button(state.selected===o.id?'Selected':'Select','select',`data-id="${esc(o.id)}" aria-pressed="${state.selected===o.id}"`)}${button('Erase','erase',`data-id="${esc(o.id)}"`)}</article>`).join(''):'<p class="modal-note">Only an ink stain.</p>';
  find('notebookLaws').innerHTML=state.laws.length?state.laws.map(l=>`<article class="notebook-entry"><b>${esc(l.definition.name)}</b><span>${esc(describeNotebookLaw(l.definition))}</span>${button(l.enabled?'Enabled':'Disabled','toggle',`data-id="${esc(l.id)}" aria-pressed="${l.enabled}"`)}${button('Erase','erase',`data-id="${esc(l.id)}"`)}</article>`).join(''):'<p class="modal-note">The lines are blank.</p>';
  find('notebookTarget').textContent=`Kindling: ${state.target.statuses.includes('onFire')?'burning':state.target.statuses.includes('wet')?'wet and unlit':'unlit'}. ${state.objects.length}/${NOTEBOOK_LIMITS.objects} objects · ${state.laws.length}/${NOTEBOOK_LIMITS.laws} laws.`;
  find('notebookUse').disabled=!state.selected||!notebookReachable(getScene());
  tick();
 }
 function show(){
  if(dialog.open||busy())return;
  if(!notebookReachable(getScene()))return;
  const open=()=>{onPause();render();dialog.showModal();find('notebookBrief').focus();};
  const event=runtime.discoverNotebook(getScene());
  if(event&&dialogue){dialogue.speak([{speaker:'Evergreen',thought:true,text:'Someone left a notebook beside the kindling. The ink is still moving.',sourceEventIds:[event.id]}],open);}
  else open();
 }
 function use(){
  if(!dialog.open&&busy())return;
  act(()=>{
   const result=runtime.useNotebook(getScene());dialog.close();onPause();
   const text=result.quenched?'The flame went out. It really followed what I wrote.':result.events.length?'The kindling changed. The page did that.':'The kindling stayed as it was. The page did not change it.';
   dialogue?.speak([{speaker:'Evergreen',thought:true,text,sourceEventIds:[result.quenched?.id||result.events[0]?.id||result.used.id]}]);
  });
 }
 function tick(){
  const near=notebookReachable(getScene());controls.hidden=!near||dialog.open||busy();
  const object=runtime.state.notebook.objects.find(o=>o.id===runtime.state.notebook.selected),useButton=controls.querySelector('#useNotebookObject');
  useButton.hidden=!object;useButton.textContent=object?`Use ${object.definition.name} · G`:'Use object · G';
 }
 find('closeNotebook').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{onPause();tick();});
 dialog.addEventListener('cancel',()=>onPause());
 dialog.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;find('notebookBrief').placeholder=page==='notebook_object'?'A small jar of rainwater':'When liquid touches kindling, its fire goes out';render();});
 find('notebookForm').onsubmit=e=>{e.preventDefault();act(()=>{runtime.requestNotebook(page,find('notebookBrief').value);message='The page is waiting for a draft. You can close the notebook while it is written.';});};
 find('notebookExample').onclick=()=>act(()=>{runtime.inscribeNotebook(page,NOTEBOOK_EXAMPLES[page]);message='Copied the handwritten page.';});
 find('notebookUse').onclick=use;
 dialog.addEventListener('click',e=>{const b=e.target.closest('[data-notebook-action]');if(!b)return;act(()=>{const {notebookAction:a,id}=b.dataset;if(a==='accept')runtime.acceptNotebookProposal(id);else if(a==='dismiss')runtime.dismissNotebook(id);else if(a==='retry'){const job=runtime.state.jobs.find(j=>j.id===id&&j.status==='failed');if(job){job.status='queued';job.error=null;runtime.changed();}}else runtime.editNotebook(id,a);});});
 controls.querySelector('#readNotebook').onclick=show;controls.querySelector('#useNotebookObject').onclick=use;
 document.addEventListener('keydown',e=>{
  if(dialog.open){if(e.key.toLowerCase()==='n'&&!e.target.matches('input,textarea')){e.preventDefault();dialog.close();}return;}
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||busy()||e.target.matches('input,textarea,select')||!notebookReachable(getScene()))return;
  if(e.key.toLowerCase()==='n'){e.preventDefault();e.stopImmediatePropagation();show();}
  if(e.key.toLowerCase()==='g'&&runtime.state.notebook.selected){e.preventDefault();e.stopImmediatePropagation();use();}
 },true);
 runtime.subscribe(()=>{if(dialog.open)render();tick();});
 return {get active(){return dialog.open;},show,tick,setProviderStatus(value){providerStatus=value;if(dialog.open)render();},draw(){}};
}
