import {CLASS_STATS} from './rules.js';
import {canExplore} from './adventure.js';
import {inRange,moveInScene} from './world.js';

export const ACTIONS = [
  {kind:'attack',key:'1',icon:'⚔',label:'Attack'},
  {kind:'heal',key:'2',icon:'✚',label:'Heal'},
  {kind:'guard',key:'3',icon:'▣',label:'Guard'},
  {kind:'interact',key:'4',icon:'◇',label:'Inspect'},
  {kind:'move',key:'5',icon:'↟',label:'Move'},
  {kind:'improvise',key:'6',icon:'✎',label:'Improvise'},
];
export function actionTargets(state,player,kind,grid) {
  const targets=kind==='heal'?state.players:kind==='interact'?[...(state.scene?.residents||[]),...(state.scene?.props||[])]:state.scene?.creatures||[];
  return targets.filter(t=>kind==='interact'?!t.secured:t.hp>0).map(t=>{
    let reason='';
    if(kind==='interact'&&t.questId&&state.scene.quests.find(q=>q.id===t.questId)?.status!=='active')reason='Accept the request first';
    if(reason)return {...t,reason};
    if(kind==='heal') {
      if(!player.heals)reason='No healing charges';
      else if(t.hp>=t.maxHp)reason='Full health';
      else if(!inRange(player,t,260))reason='Move closer';
    } else if(!inRange(player,t,kind==='attack'?player.range:90))reason='Move closer';
    else if(kind==='attack'&&grid&&!moveInScene(grid,player,t,player.range))reason='Path blocked';
    return {...t,reason};
  });
}
export function journalMoves(state,player,grid) {
  const stats=CLASS_STATS[player.heroClass];
  return ACTIONS.map(a=>{
    const targets=['attack','heal','interact'].includes(a.kind)?actionTargets(state,player,a.kind,grid):[];
    const descriptions={
      attack:`Reach up to ${player.range/20} steps along clear ground. Roll d20 + ${player.bonus} against enemy armor. On a hit, deal 1d8 + ${player.bonus} damage. A natural 20 adds 6 damage; a natural 1 misses.`,
      heal:`Restore 1d8 + 6 HP to yourself or a conscious companion. ${player.heals} charge${player.heals===1?'':'s'} left this chapter; only a successful heal uses one.`,
      guard:'Brace for the next incoming hit and halve its damage. This succeeds automatically and uses your action.',
      interact:state.scene?.adventure?'Speak to residents, accept requests, deliver parcels, or examine objects. Clear obstructions and investigate clues with a roll. Return to the requester to finish.':'Inspect a nearby landmark. A successful check secures its relic.',
      move:canExplore(state)?'Explore freely with WASD, arrows, or the direction buttons. There is no turn or total movement limit outside combat.':'Move freely during your one-minute turn. Use WASD, arrows, or the direction buttons. Taking an action ends your turn.',
      improvise:'Describe an idea in your own words. Astra interprets it as an attack, heal, guard, inspection, or conversation, then narrates your result.',
    };
    let reason=player.hp<=0?'Fallen':state.phase!=='playing'&&!canExplore(state)?'No active encounter':state.busy?'Action resolving':!canExplore(state)&&state.turn!==player.id?'Waiting for turn':'';
    if(!reason&&a.kind==='guard'&&canExplore(state))reason='No danger nearby';
    if(!reason&&targets.length&&!targets.some(t=>!t.reason))reason=a.kind==='heal'&&!player.heals?'No healing charges':'No ready targets';
    if(!reason&&['attack','heal','interact'].includes(a.kind)&&!targets.length)reason='No targets remaining';
    return {...a,label:a.kind==='attack'?stats.attack:a.label,description:descriptions[a.kind],targets,reason};
  });
}
