import {regionLife,regionProgress,regionalTasks,regionalTaskDone,regionalReady} from './region-life.js';

export function taskTarget(entry,task){
 const p=regionProgress(entry);
 if(task.kind==='delivery'&&p.carrying.includes(task.id))return regionLife(entry.content).houses[task.recipientIndex].door;
 return {x:task.x,y:task.y};
}
export function taskInstruction(entry,task){
 const p=regionProgress(entry),house=regionLife(entry.content).houses[task.recipientIndex];
 if(task.kind==='delivery')return p.carrying.includes(task.id)?`Deliver ${task.label} to ${house.resident} in ${house.name}.`:`Collect ${task.label} at ${task.place} · F.`;
 if(task.kind==='push_rock')return `Move ${task.label} at ${task.place} · F.`;
 if(task.kind==='clear_debris')return `Clear ${task.label} at ${task.place} · F.`;
 return `Defeat the patrols · ${p.defeated.length}/${regionLife(entry.content).enemies.length}.`;
}
// World facts are checked here, rather than trusting an interaction button or model prose.
export function interactRegionalTask(runtime,regionId,player,houseId=null){
 const entry=runtime.state.regions?.[regionId];if(!entry)return null;
 const p=regionProgress(entry);if(!p.accepted||p.rewarded)return null;
 for(const task of regionalTasks(entry.content)){
  if(regionalTaskDone(entry,task)||task.kind==='defeat')continue;
  const carrying=p.carrying.includes(task.id),recipient=regionLife(entry.content).houses[task.recipientIndex];
  if(houseId){if(task.kind!=='delivery'||!carrying||houseId!==recipient.id||Math.hypot(player.x-510,player.y-280)>75)continue;}
  else if(carrying||Math.hypot(player.x-task.x,player.y-task.y)>42)continue;
  let type,text;
  if(task.kind==='delivery'&&!carrying){p.carrying.push(task.id);type='parcel_collected';text=`Collected ${task.label} for ${recipient.resident}`;}
  else {p.done.push(task.id);p.carrying=p.carrying.filter(id=>id!==task.id);type={push_rock:'rock_moved',clear_debris:'debris_cleared',delivery:'parcel_delivered'}[task.kind];text=task.kind==='delivery'?`Delivered ${task.label} to ${recipient.resident} at ${recipient.name}`:`${task.kind==='push_rock'?'Moved':'Cleared'} ${task.label} at ${task.place}`;}
  // regionProgress may return a fresh normalized object during the checks above.
  entry.progress=p;
  runtime.record(type,`${regionId}:${task.id}`,text.slice(0,240),{unique:true});
  return {text,task,delivered:type==='parcel_delivered'};
 }
 return null;
}
export function regionalObstacles(entry){
 const p=regionProgress(entry);
 return regionalTasks(entry.content).filter(t=>['push_rock','clear_debris'].includes(t.kind)&&!p.done.includes(t.id)).map(t=>({x:t.x-12,y:t.y+3,w:24,h:16}));
}
export function regionalGuidance(entry,{room,house,actors,homeDirection}){
 const life=regionLife(entry.content),p=regionProgress(entry);
 if(p.rewarded)return {title:'A promise kept',text:`Return ${homeDirection} toward Cinderwatch, or ask the witch for another place.`,target:null};
 if(!p.accepted)return {title:p.offered?'A request, not an obligation':'Someone here needs a hand',text:p.offered?'Press T to review and accept the quest.':room?`Speak to ${house?.resident} · F.`:`Enter ${life.houses[0].name} to meet ${life.houses[0].resident}.`,target:p.offered?null:room?{x:510,y:280}:life.houses[0].door};
 const tasks=regionalTasks(entry.content),next=tasks.find(t=>!regionalTaskDone(entry,t));
 if(!next)return {title:life.objective.title,text:room?`Report back to ${house?.resident} · F.`:`Return to ${life.houses[0].name} for your reward.`,target:room?{x:510,y:280}:life.houses[0].door};
 const recipient=life.houses[next.recipientIndex],delivering=next.kind==='delivery'&&p.carrying.includes(next.id);
 const target=room?(delivering&&recipient.id===house?.id?{x:510,y:280}:null):next.kind==='defeat'?actors.find(a=>a.enemy&&!p.defeated.includes(a.foeId)):taskTarget(entry,next);
 return {title:life.objective.title,text:(room&&(!delivering||recipient.id!==house?.id)?'Head outside. ':'')+taskInstruction(entry,next),target};
}
export function drawTaskProps(c,entry,now=0){
 const p=regionProgress(entry);c.save();c.textAlign='center';c.font='14px VT323';
 for(const t of regionalTasks(entry.content)){
  if(t.kind==='defeat')continue;const done=p.done.includes(t.id);let x=t.x,y=t.y;
  if(t.kind==='delivery'&&(done||p.carrying.includes(t.id)))continue;
  if(t.kind==='clear_debris'&&done)continue;
  if(t.kind==='push_rock'){
   if(done)x+=26;c.fillStyle='#172722';c.fillRect(x-15,y+11,32,9);c.fillStyle=done?'#697369':'#a6a58c';c.beginPath();c.moveTo(x-14,y+12);c.lineTo(x-10,y-8);c.lineTo(x+3,y-14);c.lineTo(x+15,y);c.lineTo(x+13,y+15);c.closePath();c.fill();c.fillStyle='#d2caae';c.fillRect(x-8,y-6,12,3);
  }else if(t.kind==='clear_debris'){
   c.fillStyle='#443927';c.fillRect(x-18,y+7,37,13);c.save();c.translate(x,y+6);c.rotate(.4);c.fillStyle='#a07a48';c.fillRect(-19,-3,38,6);c.rotate(-.9);c.fillStyle='#c19a61';c.fillRect(-16,-2,32,5);c.restore();
  }else{c.fillStyle='#342a22';c.fillRect(x-12,y-9,26,26);c.fillStyle='#b3874d';c.fillRect(x-10,y-7,22,22);c.fillStyle='#ecce8a';c.fillRect(x-1,y-7,4,22);c.fillRect(x-10,y+1,22,4);}
  if(!done&&p.accepted){c.fillStyle='#f1dea8';c.fillText(t.label,x,y-22);}
 }
 c.restore();
}
