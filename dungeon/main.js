import {smoothPosition} from './motion.js';
import {CLASSES,COLORS} from './contracts.js';
import {creature,hero,background,effect} from './art.js';
import {ACTIONS,actionTargets,journalMoves} from './journal.js';
import {CLASS_STATS} from './rules.js';
import {DiceTray} from './dice.js';
import {canExplore,nearbyResident,questInstruction,questTarget,activeQuests} from './adventure.js';
import {drawTask,villageAmbience} from './scenery.js';
import {worldView} from './view.js';
import {resident} from './art.js';
import {regionGrid} from '../engine/regions.js';
import {sceneTerrain} from './world.js';
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canvas=$('#tableWorld'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let chosen='Warrior',session=null,state=null,mode='move',sending=false,polling=false,notice='',noticeUntil=0;
let sceneKey='',terrain=null,grid=null,lastLog='',lastFrame=0,journalPlayer=null,journalPage='moves',talkingTo=null;
const effects=[],seenEffects=new Set(),positions=new Map();
const descriptions={Warrior:'Hold the front line. A sturdy sword fighter with 46 HP.',Mage:'Bend the battle at range. A spellcaster with 32 HP.',Rogue:'Strike from a distance. A cunning archer with 36 HP.',Healer:'Keep the party standing. Three healing charges and 38 HP.'};
const lobbyScene={title:'The waiting fire',theme:'forest',layout:'grove',seed:4312,enemies:[],residents:[{home:'The Wayfarer Inn'},{home:'The Herbalist’s House'},{home:'The Old Smithy'}],landmarks:[{name:'The wishing well',kind:'shrine'},{name:'Watchfire',kind:'camp'}]};
terrain=background(lobbyScene);
const dice=new DiceTray($('#diceDialog'),async action=>{
  const ok=await command('action',action);
  if(!ok&&dice.phase!=='result')dice.fail(notice);
});
const renderedHTML=new WeakMap();
function replaceHTML(el,html) {if(renderedHTML.get(el)!==html){el.innerHTML=html;renderedHTML.set(el,html)}}
function portrait(canvas,p) {
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();
  const compact=canvas.width<100;
  c.scale(canvas.width/(compact?60:100),canvas.height/(compact?72:90));
  hero(c,{...p,x:compact?30:50,y:compact?60:74,name:''},0,false);c.restore();
}
const invited=new URL(location.href).searchParams.get('room');
if(invited)$('#roomCode').value=invited.toUpperCase().slice(0,6);
function classes() {
  $('#classChoices').innerHTML=CLASSES.map(c=>`<button type="button" data-class="${c}" aria-pressed="${c===chosen}">${c}</button>`).join('');
  $('#classDescription').textContent=descriptions[chosen];
  document.querySelectorAll('[data-class]').forEach(b=>b.onclick=()=>{chosen=b.dataset.class;classes()});
  portrait($('#seatPreview'),{id:'preview',heroClass:chosen,color:COLORS[CLASSES.indexOf(chosen)],weapon:CLASS_STATS[chosen].weapon,hp:1});
}
classes();
$('#actionButtons').innerHTML=ACTIONS.map(a=>`<button data-action="${a.kind}" aria-label="${a.label} (${a.key})" title="${a.label} · ${a.key}"><kbd>${a.key}</kbd><span class="action-icon" aria-hidden="true">${a.icon}</span><span class="action-name">${a.label}</span></button>`).join('');
async function api(path,{method='GET',body,auth=true}={}) {
  const res=await fetch(`/api/dungeon${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth&&session?{Authorization:`Bearer ${session.token}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});
  let data;try{data=await res.json()}catch{throw new Error('The table server is unavailable. Try again.')}
  if(!res.ok)throw Object.assign(new Error(data.error||'Request failed.'),{status:res.status});return data;
}
function saveSession(value) {
  session=value;try{if(value)sessionStorage.setItem('tilth-table-seat',JSON.stringify(value));else sessionStorage.removeItem('tilth-table-seat')}catch{}
}
function resetTable(text) {
  saveSession(null);state=null;sceneKey='';lastLog='';grid=null;dice.clear();
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  $('#lobby').hidden=false;$('#gameHud').hidden=true;$('#lobbyError').textContent=text;
  $('#actionPanel').hidden=true;terrain=background(lobbyScene);effects.length=0;positions.clear();paint();
}
function message(text) {notice=text;noticeUntil=Date.now()+6000;$('#tableStatus').textContent=text}
async function enter(join) {
  if(sending)return;
  const name=$('#playerName').value.trim();if(!name){$('#playerName').reportValidity();return}
  const code=$('#roomCode').value.trim().toUpperCase();
  if(join&&!/^[A-Z0-9]{6}$/.test(code)){$('#lobbyError').textContent='Enter the six-character room code.';return}
  sending=true;$('#lobbyError').textContent=join?'Finding your party…':'Preparing your table…';
  try {
    const data=await api(join?`/rooms/${code}/join`:'/rooms',{method:'POST',auth:false,body:{name,heroClass:chosen,wish:$('#campaignWish').value.trim()}});
    saveSession(data);dice.clear();lastLog='';sceneKey='';await poll();$('#roomDialog').showModal();
  }catch(e){$('#lobbyError').textContent=e.message}finally{sending=false;render()}
}
$('#seatForm').onsubmit=e=>{e.preventDefault();enter(false)};
$('#joinRoom').onclick=()=>enter(true);
function apply(next) {
  if(!session||next.code!==session.code||(state?.code===next.code&&next.version<state.version))return;
  state=next;$('#lobby').hidden=true;$('#gameHud').hidden=false;
  if(next.scene&&sceneKey!==`${next.code}:${next.chapter}`) {
    sceneKey=`${next.code}:${next.chapter}`;terrain=background(next.scene);grid=regionGrid(sceneTerrain(next.scene));effects.length=0;positions.clear();talkingTo=null;$('#actionPanel').hidden=true;
  }
  for(const e of next.effects||[])if(!seenEffects.has(e.id)) {
    seenEffects.add(e.id);if(Date.now()-e.time<3500)effects.push({...e,localTime:performance.now()});
  }
  if(seenEffects.size>300)seenEffects.clear();
  clockOffset=(state.serverNow??Date.now())-Date.now();dice.sync(state);render();paint();
}
async function poll() {
  if(!session||polling)return;polling=true;const code=session.code;
  try{const next=await api(`/rooms/${code}`);if(session?.code===code)apply(next)}
  catch(e){if(session?.code!==code)return;if(e.status===401||e.status===404)resetTable(e.message);else message('Reconnecting to the table…')}
  finally{polling=false}
}
setInterval(poll,900);
let clockOffset=0;
function updateTimer(){
 if(!state)return;
 const seconds=Math.max(0,Math.ceil(((state.busy?state.turnRemaining:(state.turnDeadline-Date.now()-clockOffset))||0)/1000));
 $('#movementLabel').textContent=state.busy?'Timer paused · resolving':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} remaining`;
}
setInterval(updateTimer,200);
function me(){return state?.players.find(p=>p.id===session?.playerId)}
function myTurn(){return !!me()&&me().hp>0&&(canExplore(state)||(state?.phase==='playing'&&state.turn===session?.playerId))&&!state.busy&&!sending}
function render() {
  if(!state||!me())return;
  const player=me(),actor=state.players.find(p=>p.id===state.turn);
  $('#chapterLabel').textContent=state.phase==='lobby'?`${state.players.length} / 4 TRAVELERS`:`CHAPTER ${state.chapter} / 3 · ${state.combat?'COMBAT':'EXPLORING'}`;
  $('#sceneTitle').textContent=state.scene?.title||'Around the fire';
  const partyKey=state.players.map(p=>[p.id,p.name,p.hp,p.maxHp,p.online,p.guard,p.heals,state.combat&&p.id===state.turn&&state.phase==='playing'].join(':')).join('|');
  if($('#partyStrip').dataset.key!==partyKey) {
    $('#partyStrip').dataset.key=partyKey;
    $('#partyStrip').innerHTML=state.players.map(p=>`<button class="party-seat ${state.combat&&p.id===state.turn&&state.phase==='playing'?'active':''}" data-player="${p.id}" aria-label="Open ${escape(p.name)}’s journal"><canvas width="72" height="92" aria-hidden="true"></canvas><div><div class="party-name"><span>${escape(p.name)}</span></div><div class="party-health"><span style="width:${p.hp/p.maxHp*100}%"></span></div><div class="party-info">${p.hp}/${p.maxHp} HP · ${p.hp<=0?'fallen':!p.online?'away':p.guard?'guard':p.id===player.id?'you':p.heroClass}</div></div></button>`).join('');
    $('#partyStrip').querySelectorAll('[data-player]').forEach(el=>{
      portrait(el.querySelector('canvas'),state.players.find(p=>p.id===el.dataset.player));
      el.onclick=()=>openJournal(el.dataset.player);
    });
  }
  $('#objective').textContent=state.phase==='lobby'?'Share the room code. Your adventure begins together.':state.phase==='won'?'The final relic is yours. A tale worth remembering.':state.phase==='lost'?'The party has fallen. Your story lives in the journal.':state.phase==='cleared'?'Chapter complete. Open Menu to travel onward.':state.scene.adventure&&state.chapter<3?(activeQuests(state.scene).find(q=>q.status!=='offered')||activeQuests(state.scene)[0]?questInstruction(state.scene,activeQuests(state.scene).find(q=>q.status!=='offered')||activeQuests(state.scene)[0]):state.scene.goal):state.scene.goal;
  const logKey=state.log.at(-1)?.id||'empty';
  if(logKey!==lastLog) {
    const log=$('#storyLog'),atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<60;
    log.innerHTML=state.log.slice(-40).map(l=>`<div class="story-entry ${escape(l.kind)}"><strong>${escape(l.speaker)}</strong>${escape(l.text)}</div>`).join('')||'<p class="story-entry">The dungeon master is waiting for the party.</p>';
    if(atBottom)log.scrollTop=log.scrollHeight;
    $('#latestStory').textContent=state.log.findLast(l=>l.speaker==='Dungeon Master')?.text||'Gather your companions, then let the tale begin.';
    lastLog=logKey;
  }
  $('#turnLabel').textContent=state.busy?'The dungeon master is considering…':state.phase==='lobby'?'Gather your companions':state.phase==='won'?'Expedition complete':state.phase==='lost'?'The fire grows quiet':state.phase==='cleared'?'The road opens ahead':canExplore(state)?'Explore · WASD to walk':state.turn===player.id?'Your turn':`${actor?.name||'A companion'}’s turn`;
  $('#movementLabel').hidden=!state.combat||state.phase!=='playing';
  updateTimer();
  document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=!myTurn();b.setAttribute('aria-pressed',String(!$('#actionPanel').hidden&&mode===b.dataset.action))});
  $('#endTurn').hidden=!state.combat;$('#endTurn').disabled=!myTurn();$('#actionIdea').disabled=!myTurn();$('#improviseButton').disabled=!myTurn();
  renderAction();renderJournal();
  $('#storyButton').hidden=false;const nearby=nearbyResident(state.scene,player);$('#nearbyTalk').hidden=!nearby||!myTurn();$('#nearbyTalk').textContent=nearby?`F · Speak to ${nearby.name}`:'';
  $('#roomSummary').textContent=`Room ${state.code} · ${state.players.length} / ${state.capacity} players. ${state.wish}`;
  $('#startAdventure').hidden=state.host!==player.id||!['lobby','cleared'].includes(state.phase);
  $('#startAdventure').disabled=state.busy||!state.configured;$('#startAdventure').textContent=state.phase==='cleared'?'Travel to the next chapter':'Begin the adventure';
  $('#leaveRoom').disabled=state.busy;
  $('#roomHelp').textContent=!state.configured?'Add OPENAI_API_KEY to the server to connect the dungeon master.':state.busy?'Astra is preparing the next moment. Everyone will see the result together.':state.phase==='lobby'?'Invite up to three companions before starting. Reloading this tab keeps your seat.':'Explore freely and speak to residents with F. Turns begin only when you approach or attack an enemy. J opens your journal and party requests.';
  $('#tableStatus').textContent=Date.now()<noticeUntil?notice:$('#diceDialog').open?'':state.error||'';
}
function renderAction() {
  if($('#actionPanel').hidden)return;
  $('#residentConversation').hidden=!talkingTo;
  if(talkingTo){renderResident();return}
  const player=me(),definition=journalMoves(state,player,grid).find(a=>a.kind===mode);
  $('#actionTitle').textContent=definition?.label||'Choose your action';
  $('#actionHint').textContent=mode==='move'?(canExplore(state)?'Walk freely. Use WASD, arrows, or the direction buttons.':'Move freely during your one-minute turn. Take an action before time runs out.'):mode==='improvise'?'Your words become an action. The dungeon master decides the check.':mode==='heal'?`${player.heals} healing charges left. Choose yourself or a wounded companion.`:mode==='interact'?'Speak to a resident or examine a nearby object.':'Choose an enemy, then bring out the dice.';
  $('#targetRow').hidden=!['attack','heal','interact'].includes(mode);$('#movePad').hidden=mode!=='move';$('#improviseForm').hidden=mode!=='improvise';
  const targets=actionTargets(state,player,mode,grid),picker=$('#targetPicker'),selected=picker.value;
  const options=targets.map(t=>`<option value="${t.id}">${escape(t.name)}${t.reason?` · ${escape(t.reason)}`:t.hp!==undefined?` · ${t.hp} HP`:''}</option>`).join('');
  if(picker.innerHTML!==options){picker.innerHTML=options;if(targets.some(t=>t.id===selected))picker.value=selected;else if(targets.some(t=>!t.reason))picker.value=targets.find(t=>!t.reason).id}
  picker.disabled=!myTurn();$('#targetAction').disabled=!myTurn()||!targets.length||Boolean(targets.find(t=>t.id===picker.value)?.reason);
  $('#movePad').querySelectorAll('button').forEach(b=>b.disabled=!myTurn());
  const suggestions=(state.scene?.suggestions||[]).slice(0,2),key=suggestions.join('|');
  if($('#suggestions').dataset.key!==key){$('#suggestions').dataset.key=key;$('#suggestions').innerHTML=suggestions.map(s=>`<button type="button" data-suggestion="${escape(s)}">${escape(s)}</button>`).join('');$('#suggestions').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#actionIdea').value=b.dataset.suggestion;$('#actionIdea').focus()})}
  $('#suggestions').querySelectorAll('button').forEach(b=>b.disabled=!myTurn());
}
function openJournal(id=session?.playerId) {
  journalPlayer=id;journalPage='moves';renderJournal();$('#journalDialog').showModal();
}
function renderJournal() {
  const p=state.players.find(p=>p.id===journalPlayer)||me();if(!p)return;
  $('#journalTitle').textContent=`${p.name}’s journal`;
  replaceHTML($('#journalPlayers'),state.players.map(v=>`<button data-journal-player="${v.id}" aria-pressed="${v.id===p.id}">${escape(v.name)}${v.id===session.playerId?' · you':''}</button>`).join(''));
  $('#journalPlayers').querySelectorAll('button').forEach(b=>b.onclick=()=>{journalPlayer=b.dataset.journalPlayer;renderJournal()});
  portrait($('#journalPortrait'),p);$('#journalClass').textContent=`${p.heroClass} · ${p.weapon}`;
  $('#journalStats').textContent=`${p.hp} / ${p.maxHp} HP · +${p.bonus} to checks · ${p.heals} heal${p.heals===1?'':'s'}`;
  $('#journalTurn').textContent=p.hp<=0?'Fallen · cannot act':canExplore(state)?'Free exploration · help the residents':state.phase!=='playing'?'Between encounters':state.turn===p.id?'One-minute turn · move freely, then take an action':'Waiting for their turn';
  document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(journalPage===b.dataset.page)));
  if(journalPage==='quests'){renderQuests();return}
  if(journalPage==='history') {
    const entries=p.journal||[];
    replaceHTML($('#journalContent'),(state.scene?`<p class="eyebrow">CHAPTER ${state.chapter} · ${escape(state.scene.title)}</p><p>${escape(state.scene.goal)}</p>`:'')+([...entries].reverse().map(e=>`<article class="journey-entry"><span class="eyebrow">CHAPTER ${e.chapter} · ${e.automatic?'GUARD':e.success?'SUCCESS':'MISS'}</span><h3>${escape(e.intent)}</h3><p>${escape(e.narration)}</p><small>${escape(e.detail)}</small></article>`).join('')||'<p class="empty-journal">A fresh page. Completed actions and their outcomes will be recorded here.</p>'));
    return;
  }
  replaceHTML($('#journalContent'),journalMoves(state,p,grid).map(a=>`<article class="move-entry"><div class="move-heading"><h3>${a.icon} ${escape(a.label)}</h3>${p.id===session.playerId?`<button data-journal-action="${a.kind}" ${a.reason||!myTurn()?'disabled':''}>${a.kind==='guard'?'Raise guard':'Choose'} <kbd>${a.key}</kbd></button>`:''}</div><p>${escape(a.description)}</p>${a.reason?`<div class="move-state">${escape(a.reason)}</div>`:''}${a.targets.length?`<div class="move-targets">${a.targets.map(t=>`${escape(t.name)} · ${escape(t.reason||'in reach')}`).join('<br>')}</div>`:''}</article>`).join(''));
  $('#journalContent').querySelectorAll('[data-journal-action]').forEach(b=>b.onclick=()=>{$('#journalDialog').close();selectAction(b.dataset.journalAction)});
}
function openResident(id) {
  const n=state.scene.residents.find(n=>n.id===id);if(!n||Math.hypot(n.x-me().x,n.y-me().y)>75)return;
  talkingTo=id;mode='interact';$('#actionPanel').hidden=false;render();paint();
}
function renderResident() {
  const n=state.scene.residents.find(n=>n.id===talkingTo);if(!n){closeAction();return}
  $('#actionTitle').textContent=n.name;$('#actionHint').textContent=`${n.role} · ${n.home}`;
  $('#targetRow').hidden=true;$('#movePad').hidden=true;$('#improviseForm').hidden=true;$('#residentGreeting').textContent=n.greeting;
  const near=Math.hypot(n.x-me().x,n.y-me().y)<=75;
  const requests=state.scene.quests.filter(q=>q.giverId===n.id||(q.recipientId===n.id&&q.kind==='delivery'&&q.status==='active'));
  replaceHTML($('#residentRequests'),requests.map(q=>{
    const action=q.status==='offered'&&q.giverId===n.id?'accept':q.status==='ready'&&q.giverId===n.id?'claim':q.status==='active'&&q.kind==='delivery'&&q.recipientId===n.id?'deliver':null;
    return `<article class="resident-request"><h3>${escape(q.title)}</h3><p>${escape(q.status==='complete'?q.thanks:q.status==='offered'?q.description:questInstruction(state.scene,q))}</p>${action?`<button data-request="${q.id}" data-quest-action="${action}" ${!near||!myTurn()||state.combat?'disabled':''}>${action==='accept'?'Accept request':action==='deliver'?`Deliver ${escape(q.item)}`:'Complete request'}</button>`:`<span>${q.status==='complete'?'✓ Completed':'In your party journal'}</span>`}</article>`;
  }).join(''));
  $('#residentRequests').querySelectorAll('[data-request]').forEach(b=>b.onclick=()=>act(b.dataset.questAction,{questId:b.dataset.request}));
  $('#askResident').disabled=!near||!myTurn();
}
function renderQuests() {
  const quests=state.scene?.quests||[];
  replaceHTML($('#journalContent'),quests.map(q=>{
    const target=questTarget(state.scene,q),dx=(target?.x||0)-me().x,dy=(target?.y||0)-me().y;
    const direction=Math.abs(dx)>Math.abs(dy)?dx>0?'east':'west':dy>0?'south':'north';
    return `<article class="move-entry"><span class="eyebrow">${escape(q.status.toUpperCase())} · ${escape(q.kind.toUpperCase())}</span><h3>${escape(q.title)}</h3><p>${escape(q.description)}</p><p class="quest-next">${q.status==='complete'?'✓ Request complete':escape(questInstruction(state.scene,q))}</p>${q.status!=='complete'?`<small>Head ${direction} · about ${Math.ceil(Math.hypot(dx,dy)/20)} steps away</small>`:''}</article>`;
  }).join('')||'<p>Explore this chapter and examine its landmarks.</p>');
}
$('#nearbyTalk').onclick=()=>{const n=nearbyResident(state.scene,me());if(n)openResident(n.id)};
$('#askResident').onclick=()=>{const id=talkingTo;talkingTo=null;mode='improvise';$('#actionIdea').dataset.resident=id;$('#actionIdea').value='';render();$('#actionIdea').focus()};
async function command(path,body) {
  if(!session||sending)return false;
  const code=session.code;sending=true;render();
  try{const next=await api(`/rooms/${code}/${path}`,{method:'POST',body});if(session?.code===code)apply(next);noticeUntil=0;return true}
  catch(e){message(e.message);return false}finally{sending=false;render()}
}
function act(kind,extra={}) {
  if(!myTurn())return;
  const action={kind,turnId:state.turnId,actionId:crypto.randomUUID(),...extra};
  if(['move','guard','end','accept','deliver','claim'].includes(kind))return command('action',action);
  const target=state.scene?.creatures.find(t=>t.id===extra.targetId)||state.scene?.props.find(t=>t.id===extra.targetId)||state.scene?.residents.find(t=>t.id===extra.targetId)||state.players.find(t=>t.id===extra.targetId);
  $('#actionPanel').hidden=true;render();
  const name=kind==='improvise'?extra.text:`${kind==='attack'?CLASS_STATS[me().heroClass].attack:kind==='interact'?'Inspect':'Heal'} · ${target?.name||''}`;
  dice.prepare(action,me(),name,kind==='attack'?target?.armor:null);
}
function chooseTarget(id) {
  if(!myTurn()||!['attack','heal','interact'].includes(mode))return;
  const target=actionTargets(state,me(),mode,grid).find(t=>t.id===id);
  if(!target)return;if(target.reason){message(`${target.name}: ${target.reason.toLowerCase()}.`);return}
  if(state.scene.residents.some(n=>n.id===id)){openResident(id);return}
  act(mode,{targetId:id});
}
function selectAction(kind) {
  if(!myTurn())return;
  if(kind==='guard'){act(kind,{targetId:session.playerId});return}
  talkingTo=null;mode=kind;$('#actionIdea').dataset.resident='';$('#actionPanel').hidden=false;render();paint();
  if(kind==='improvise')$('#actionIdea').focus();
}
function closeAction(){talkingTo=null;$('#actionPanel').hidden=true;mode='move';render();paint()}
$('#targetPicker').onchange=renderAction;
$('#targetAction').onclick=()=>chooseTarget($('#targetPicker').value);
$('#closeAction').onclick=closeAction;
for(const b of document.querySelectorAll('[data-step]'))b.onclick=()=>{if(!myTurn())return;const [dx,dy]=b.dataset.step.split(',').map(Number),p=me();act('move',{x:p.x+dx,y:p.y+dy})};
$('#roomMenuButton').onclick=()=>$('#roomDialog').showModal();$('#closeRoom').onclick=()=>$('#roomDialog').close();
$('#startAdventure').onclick=()=>{command('start',{});$('#roomDialog').close()};
$('#leaveRoom').onclick=async()=>{if(sending)return;try{await api(`/rooms/${session.code}/leave`,{method:'POST',body:{}});resetTable('You left the table.')}catch(e){message(e.message)}};
$('#copyInvite').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('room',state.code);try{await navigator.clipboard.writeText(url.toString());$('#roomHelp').textContent='Invite link copied.'}catch{$('#roomHelp').textContent=`Share this code: ${state.code}`}};
$('#journalButton').onclick=()=>openJournal();$('#closeJournal').onclick=()=>$('#journalDialog').close();
for(const b of document.querySelectorAll('[data-page]'))b.onclick=()=>{journalPage=b.dataset.page;renderJournal()};
function openChronicle(){ $('#chronicle').showModal();$('#storyLog').scrollTop=$('#storyLog').scrollHeight }
$('#storyButton').onclick=openChronicle;$('#closeChronicle').onclick=()=>$('#chronicle').close();
$('#chatForm').onsubmit=async e=>{e.preventDefault();const input=$('#chatInput'),text=input.value.trim();if(!text)return;try{apply(await api(`/rooms/${session.code}/chat`,{method:'POST',body:{text}}));input.value=''}catch(e){message(e.message)}};
$('#improviseForm').onsubmit=e=>{e.preventDefault();const text=$('#actionIdea').value.trim();if(text&&myTurn())act('improvise',{text,targetId:$('#actionIdea').dataset.resident||undefined})};
for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>selectAction(b.dataset.action);
$('#endTurn').onclick=()=>{closeAction();act('end')};
let renderedView=null;
function camera() {
  const panel=$('#diceDialog').open?$('#diceDialog'):$('#actionPanel').hidden?null:$('#actionPanel');
  const view=worldView(canvas.clientWidth,canvas.clientHeight,state?.scene?(positions.get(me()?.id)||me()):null,{panel:!!panel,panelHeight:panel?.getBoundingClientRect().height||0});
  if(canvas.width!==view.width||canvas.height!==view.height){canvas.width=view.width;canvas.height=view.height}
  return renderedView=view;
}
function screenPoint(e) {
  const r=canvas.getBoundingClientRect(),view=renderedView||camera();
  return {x:(e.clientX-r.left)/r.width*canvas.width+view.x,y:(e.clientY-r.top)/r.height*canvas.height+view.y};
}
canvas.onclick=e=>{
  if(!myTurn()||$('dialog[open]'))return;
  const point=screenPoint(e);
  if(mode==='move'){const n=state.scene.residents.find(n=>Math.hypot(n.x-point.x,n.y-point.y)<22);if(n){if(Math.hypot(n.x-me().x,n.y-me().y)<=75)openResident(n.id);else message(`Walk closer to ${n.name} to speak.`);return}act('move',{x:Math.round(point.x),y:Math.round(point.y)});return}
  const targets=actionTargets(state,me(),mode,grid),target=[...targets].sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y))[0];
  if(target&&Math.hypot(target.x-point.x,target.y-point.y)<65)chooseTarget(target.id);
};
document.addEventListener('keydown',e=>{
  if(!state||e.target.matches('input,textarea,select')||$('dialog[open]'))return;
  const key=e.key.toLowerCase();
  if(key==='escape'){e.preventDefault();if(!$('#actionPanel').hidden)closeAction();else $('#roomDialog').showModal();return}
  if(key==='j'){e.preventDefault();openJournal();return}if(key==='c'){e.preventDefault();openChronicle();return}
  if(!myTurn())return;
  if(key==='f'){e.preventDefault();const npc=nearbyResident(state.scene,me());if(npc)openResident(npc.id);return}
  const action=ACTIONS.find(a=>a.key===key);if(action){e.preventDefault();selectAction(action.kind);return}
  // Leave Enter/Space on focused buttons to their native activation.
  if(key==='enter'&&state.combat&&!e.target.matches('button')){e.preventDefault();closeAction();act('end');return}
  const d={w:[0,-20],arrowup:[0,-20],s:[0,20],arrowdown:[0,20],a:[-20,0],arrowleft:[-20,0],d:[20,0],arrowright:[20,0]}[key];
  if(d){e.preventDefault();const p=me();act('move',{x:p.x+d[0],y:p.y+d[1]})}
});
export function paint(now=performance.now()) {
 const elapsed=lastFrame?Math.max(0,now-lastFrame):16;lastFrame=now;
 const displays=new Map();
 for(const [i,p] of (state?.players||[]).entries()){
  const target=state?.scene?p:{...p,x:320+i*60,y:355};
  const position=smoothPosition(positions.get(p.id),target,elapsed,{instant:reduced.matches});
  positions.set(p.id,position);displays.set(p.id,{...target,...position});
 }
 const offset=camera();ctx.fillStyle='#203d30';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(-offset.x,-offset.y);
 ctx.drawImage(terrain,-400,-400);const scene=state?.scene;
 if(scene){
  for(const prop of scene.props){if(!prop.questId&&prop.secured){ctx.font='18px VT323';ctx.textAlign='center';ctx.fillStyle='#c8dfa8';ctx.fillText('✓',prop.x,prop.y-24)}}
 }
 const actors=[];
 for(const prop of scene?.props||[])if(prop.questId)actors.push({y:prop.y+5,draw:()=>drawTask(ctx,prop,scene.quests.find(q=>q.id===prop.questId)?.status==='active',reduced.matches?0:now)});
 for(const layer of terrain.layers||[]){
  if(layer.x+layer.image.width<offset.x||layer.x>offset.x+canvas.width||layer.y+layer.image.height<offset.y||layer.y>offset.y+canvas.height)continue;
  actors.push({y:layer.depth,draw:()=>{const subjects=[...displays.values(),...(scene?.residents||[])];const overPlayer=layer.type==='trees'&&subjects.some(p=>Math.abs(p.x-layer.cx)<48&&p.y+12<layer.cy&&p.y>layer.cy-86);ctx.globalAlpha=overPlayer ? .08 : 1;ctx.drawImage(layer.image,layer.x,layer.y);ctx.globalAlpha=1}});
 }
 for(const n of scene?.residents||[])actors.push({y:n.y+12,draw:()=>resident(ctx,n,scene.quests,now)});
 for(const e of scene?.creatures||[])actors.push({y:e.y+12,draw:()=>creature(ctx,e,reduced.matches?0:now)});
 for(const [i,p] of (state?.players||[]).entries()){
  const display=displays.get(p.id);
  actors.push({y:display.y+12,draw:()=>hero(ctx,display,now,state?.combat&&state.turn===p.id,effects.findLast(e=>e.from.id===p.id&&now-e.localTime<900))});
 }
 actors.sort((a,b)=>a.y-b.y);actors.forEach(a=>a.draw());
 if(scene)villageAmbience(ctx,scene,reduced.matches?0:now);
 for(const e of effects)effect(ctx,e,now,reduced.matches);while(effects.length&&now-effects[0].localTime>1200)effects.shift();
 if(state&&Date.now()>noticeUntil&&notice){notice='';render()}ctx.restore();
}
function animate(now){paint(now);requestAnimationFrame(animate)}
paint();requestAnimationFrame(animate);
try{const stored=JSON.parse(sessionStorage.getItem('tilth-table-seat'));if(stored?.code&&stored.token){session=stored;poll()}}catch{}
