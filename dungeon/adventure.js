import {inRange} from './world.js';
export function activeQuests(scene){return (scene?.quests||[]).filter(q=>q.status!=='complete')}
export function questTarget(scene,quest) {
  return quest.status==='offered'||quest.status==='ready'?scene.residents.find(n=>n.id===quest.giverId):quest.kind==='delivery'?scene.residents.find(n=>n.id===quest.recipientId):scene.props.find(p=>p.questId===quest.id);
}
export function questInstruction(scene,quest) {
  const giver=scene.residents.find(n=>n.id===quest.giverId),recipient=scene.residents.find(n=>n.id===quest.recipientId);
  if(quest.status==='offered')return `Speak to ${giver.name} at ${giver.home}.`;
  if(quest.status==='ready')return `Return to ${giver.name} to finish the request.`;
  if(quest.kind==='delivery')return `Take ${quest.item} to ${recipient.name} at ${recipient.home}.`;
  return `${quest.kind==='clear'?'Clear':'Examine'} ${quest.item} near ${quest.place}.`;
}
export function nearbyResident(scene,player){return (scene?.residents||[]).filter(n=>inRange(player,n,75)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]}
export function canExplore(state){return state?.scene?.adventure&&state.combat===false&&['playing','cleared','won'].includes(state.phase)}
