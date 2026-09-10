import {NOTEBOOK_LIMITS,validateNotebookContent,KINDLING_ID} from './notebook-core.js';
import {notebookSnapshot,notebookWorldContext} from './notebook-world.js';
import {GENERATION_POLICY} from '../content/game-config.js';
export function completeNotebookJob(job,content){job.proposal=validateNotebookContent(job.kind,content);job.notebookStatus='pending';}
export function notebookJobContext(job){return {brief:job.brief,notebook:job.notebook,events:job.notebookEvents||[]};}
export function restoreNotebookJobs(jobs){for(const job of jobs.filter(j=>j.kind?.startsWith('notebook_'))){try{if(job.proposal)job.proposal=validateNotebookContent(job.kind,job.proposal);if(!job.notebook||!Number.isSafeInteger(job.notebook.revision)||typeof job.notebook.worldId!=='string'||!Array.isArray(job.notebookEvents))throw new Error();}catch{job.status='dismissed';delete job.proposal;}}}
export function requestNotebook(runtime,simulation,kind,brief){
 if(!['notebook_object','notebook_law'].includes(kind)||typeof brief!=='string'||!brief.trim()||brief.length>NOTEBOOK_LIMITS.brief)throw new Error('Describe a page in 1–600 characters.');
 if(!simulation.state.notebook.discovered)throw new Error('Find the notebook first.');
 if(runtime.state.jobs.some(j=>j.kind.startsWith('notebook_')&&['queued','running','failed'].includes(j.status)))throw new Error('A notebook page is already waiting. Retry or dismiss it first.');
 if(runtime.state.jobs.length>=GENERATION_POLICY.maxJobs)throw new Error('The saved generation budget is full. The handwritten examples still work.');
 const observed=new Set(simulation.state.actors.player.memories.map(m=>m.eventId));
 const events=simulation.state.events.filter(e=>e.kind.startsWith('notebook_')&&observed.has(e.id)).slice(-20).map(e=>({id:e.id,type:e.kind,target:e.subject,label:e.text.slice(0,240)}));
 if(!events.length)throw new Error('No recorded notebook discovery is available.');
 const key=`notebook:${runtime.id()}`;runtime.enqueue(kind,key,[]);const job=runtime.state.jobs.find(j=>j.key===key);
 Object.assign(job,{brief:brief.trim(),notebook:notebookWorldContext(simulation),notebookEvents:events});runtime.changed();return job;
}
export function notebookRuntimeFacade(runtime,simulation,controller){
 const run=op=>{const result=controller.apply({actor:'player',intent:'Use the notebook',ops:[{kind:'notebook',...op}]});if(!result.ok)throw new Error(result.reason);return result;};
 return {
  get state(){return {jobs:runtime.state.jobs,notebook:notebookSnapshot(simulation,runtime.state.jobs)};},
  changed:()=>runtime.changed(),subscribe:fn=>runtime.subscribe(fn),
  discoverNotebook(){if(simulation.state.notebook.discovered)return null;return run({action:'discover'}).events.find(e=>e.kind==='notebook_discovered');},
  requestNotebook(kind,brief){simulation.sync(controller.snapshot());return requestNotebook(runtime,simulation,kind,brief);},
  inscribeNotebook(kind,content,{revision=simulation.state.notebook.revision,source='authored',worldId=simulation.state.id}={}){return run({action:'inscribe',page:kind,content,revision,worldId,source});},
  acceptNotebookProposal(id){const job=runtime.state.jobs.find(j=>j.id===id&&j.proposal&&j.notebookStatus==='pending');if(!job)throw new Error('That draft is no longer available.');run({action:'inscribe',page:job.kind,content:job.proposal,revision:job.notebook.revision,worldId:job.notebook.worldId,source:'ai'});job.notebookStatus='accepted';runtime.changed();},
  dismissNotebook(id){const job=runtime.state.jobs.find(j=>j.id===id);if(!job)return;if(job.proposal)job.notebookStatus='dismissed';if(['queued','failed'].includes(job.status))job.status='dismissed';runtime.changed();},
  editNotebook(entity,action){return run({action,entity});},
  useNotebook(){const result=run({action:'use',entity:simulation.state.notebook.selected,target:KINDLING_ID});return{used:result.events.find(e=>e.kind==='notebook_object_used'),events:result.events.filter(e=>e.kind==='notebook_status_changed'),quenched:result.events.find(e=>e.kind==='notebook_status_changed'&&e.data.status==='onFire'&&!e.data.on)};}
 };
}
