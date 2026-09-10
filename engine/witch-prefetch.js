export function witchEvidence(state){return [...new Map([
 ...state.events.filter(e=>e.type==='combat_hit').slice(-6),
 ...state.events.filter(e=>['rock_moved','debris_cleared','parcel_delivered'].includes(e.type)).slice(-6),
 ...state.events.filter(e=>e.type==='quest_completed').slice(-4),
 ...state.events.filter(e=>['room_entered','combo_learned','region_house'].includes(e.type)).slice(-4)
].map(e=>[e.id,e])).values()].map(({id,type,target,label})=>({id,type,target,label}));}
export class WitchGreetingCache {
 constructor(load,{clock=Date.now}={}){this.load=load;this.clock=clock;this.lastStart=-Infinity;this.entry=null;}
 key(target,events){return JSON.stringify([target.id,events])}
 prefetch(target,events){
  const key=this.key(target,events);if(this.entry?.key===key)return this.entry.promise;
  if(this.clock()-this.lastStart<45000)return null;
  this.clear();this.lastStart=this.clock();const controller=new AbortController();
  const entry={key,controller};entry.promise=Promise.resolve().then(()=>this.load(events,controller.signal)).catch(()=>null);this.entry=entry;return entry.promise;
 }
 take(target,events){const entry=this.entry;if(entry?.key!==this.key(target,events)){this.clear();return null}this.entry=null;return entry;}
 clear(){this.entry?.controller.abort();this.entry=null;}
}
