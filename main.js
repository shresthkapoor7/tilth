import {WorldEffects} from './engine/world-effects.js';
import {interactRegionalTask,regionalObstacles,regionalGuidance,drawTaskProps,taskInstruction} from './engine/regional-tasks.js';
import {regionLife,regionProgress,defeatRegionalEnemy,completeRegionalObjective,regionHouseAt,offerRegionalQuest,regionalReady,regionalTasks} from './engine/region-life.js';
import {RegionAtlas,neighbor,edgeAt,arrival,regionGrid,drawRegion} from './engine/regions.js';
import {installBoundaryWitch} from './engine/boundary-witch.js';
import {setRegionTerrain,setTaskObstacles} from './world.js';
import {ACTORS} from './content/encounters.js';
import {awakenedMove,awakenedCombo,movePose,drawAwakenedMove} from './engine/awakened-moves.js';
const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {Encounters} from './engine/encounters.js';
import {ReactionVoice} from './engine/reaction-voice.js';
import {drawEncounter,drawEncounterSpeech} from './engine/encounter-renderer.js';
import {installOnboarding} from './engine/onboarding.js';
import {WEAPONS,characterContent,weaponMove} from './content/characters.js';
import {installDialogue} from './engine/dialogue-ui.js';
import {observeCharacterEvent,rowanGoal,rowanConversation} from './engine/character-memory.js';
import {nextGuidance} from './engine/quest-guidance.js';
import {CLASS_COLORS,ITEMS} from './content/game-config.js';
import {GameRuntime} from './engine/runtime.js';
import {GenerationQueue} from './engine/generation.js';
import {installGameUI} from './engine/game-ui.js';
import {drawAttachment} from './engine/generated-renderer.js';
let storage;try{storage=localStorage}catch{}
const runtime=new GameRuntime({storage});
const atlas=new RegionAtlas(runtime);
const effects=new WorldEffects();
const encounters=new Encounters({onImpact:(x,y,damage)=>effects.impact(x,y,damage,performance.now(),matchMedia('(prefers-reduced-motion: reduce)').matches),onProvoked:a=>{const event=runtime.record('combat_hit',a.id,`Struck ${a.name} with ${actionName(attackKind)} in ${atlas.content?.name||'Cinderwatch'}`);if(atlas.content&&a.enemy)encounters.say(a,a.warning);else voice.request(a,event)},onFeedback:message=>{toast(message);playSound('Heavy')},onDefeated:a=>{if(atlas.content&&a.enemy){a.persistentDefeat=true;defeatRegionalEnemy(runtime,atlas.current,a.foeId)}}});
const rowan=encounters.actors.find(a=>a.id==='rowan');Object.assign(rowan,rowanGoal(runtime.state.characterMemory));rowan.home={x:rowan.x,y:rowan.y};
const voice=new ReactionVoice({isEnabled:()=>generation.enabled,onLine:(a,line,event)=>{encounters.say(a,line);runtime.state.journal.push({id:crypto.randomUUID(),title:`${a.name} answered`,summary:line,sourceEventIds:[event.id],source:'ai',time:Date.now()});runtime.changed()},onError:()=>toast('AI reply unavailable. Characters can still defend themselves.')});
let creator,witch;
let engineUI,generatedSkillStart=-Infinity,generatedSkillReady=0,activeGeneratedMove=null,generatedDirection='down';
import {ComboTracker,COMBOS} from './combos.js';
import {ACTIONS} from './combat-visuals.js';
import {advance,doorwayAt,exitAt} from './world.js';
import {drawInterior} from './interiors.js';
import {playSound, initSound} from './sound.js';
import {drawVolcanic, drawHero, atmosphere} from './volcanic.js';
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d');
let player={x:400,y:335}, gear='Ashguard armor', heroClass='Warrior', frame=0;
let attackStart=-Infinity,attackKind='Slash',lastActionTick=0;
const actionReady={};
const comboTracker=new ComboTracker();let comboNoticeUntil=0;
const actionDefinition=name=>['Awakened','AwakenedCombo'].includes(name)?{name:(name==='AwakenedCombo'?runtime.activeOffer()?.content.skill.combo?.name:runtime.activeOffer()?.content.skill.name)||'Awakened move',duration:runtime.activeOffer()?.content.skill.durationMs||600,cooldown:runtime.activeOffer()?.content.skill.cooldownMs||2000,sound:'Rally'}:weaponMove(runtime.state.profile.weapon||'sword',name,ACTIONS[name]);
const actionName=name=>actionDefinition(name)?.name||name;
const activeDuration=()=>actionDefinition(attackKind).duration;
let equippedAwakening;function syncAwakening(){const offer=runtime.activeOffer();if(equippedAwakening===offer?.id)return;equippedAwakening=offer?.id;const combo=awakenedCombo(offer?.content);comboTracker.setCombos([...COMBOS,...(combo?[combo]:[])]);activeGeneratedMove=null;generatedSkillStart=-Infinity;encounters.generated=null;}runtime.subscribe(syncAwakening);syncAwakening();
let facing='down', walkingUntil=0, currentRoom=null, returnPoint=null,regionalHouse=null;
const regionCanvas=document.createElement('canvas');regionCanvas.width=800;regionCanvas.height=600;
const hubActors=encounters.actors,regionActors=new Map();
const roomCanvas=document.createElement('canvas');roomCanvas.width=800;roomCanvas.height=600;
const colors=CLASS_COLORS;
const dialogue=installDialogue({speakerLabel:speaker=>speaker==='Evergreen'?(runtime.state.profile.name||'Evergreen'):speaker,drawPortrait(c,speaker){c.clearRect(0,0,120,120);const custom=speaker==='Evergreen'&&runtime.state.profile.onboarded?characterContent(runtime.state.profile):undefined;if(custom)drawAttachment(c,60,78,3,{appearance:custom.characterArt});drawHero(c,60,78,speaker==='Rowan'?'#96815b':colors[heroClass],3,undefined,false,{custom,direction:'down',role:speaker==='Rowan'?'Warrior':heroClass})},sound:()=>playSound('select')});
function recordCharacterMoment(event,{speak=true}={}){const result=observeCharacterEvent(runtime.state.characterMemory,event,{room:currentRoom,player,rowan});runtime.state.characterMemory=result.memory;runtime.changed();if(speak)dialogue.speak(result.lines)}
function introduceCharacter(){if(runtime.state.profile.onboarded&&!runtime.state.characterMemory.introduced){runtime.state.characterMemory.introduced=true;runtime.changed();dialogue.speak([{speaker:'Evergreen',thought:true,text:'Beyond these roads, a witch can open the place I ask for. They say she remembers what we do. I should choose carefully.'}])}}

if(colors[runtime.state.profile.heroClass])heroClass=runtime.state.profile.heroClass;
if(ITEMS.some(i=>i[1]===runtime.state.profile.gear))gear=runtime.state.profile.gear;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)}
function pixelText(c,t,x,y,color='#fff9d8',size=12){c.font=`${size}px VT323,monospace`;c.textAlign='center';c.fillStyle='#345438';c.fillText(t,x+1,y+1);c.fillStyle=color;c.fillText(t,x,y)}
function sprite(c,x,y,color=colors[heroClass],scale=1,name){
 const isPlayer=name==='Evergreen',custom=isPlayer&&runtime.state.profile.onboarded?characterContent(runtime.state.profile):undefined;
 if(isPlayer){if(custom)drawAttachment(c,x,y,scale,{appearance:custom.characterArt});drawAttachment(c,x,y,scale,runtime.activeOffer()?.content)}
 drawHero(c,x,y,color,scale,isPlayer?runtime.state.profile.name||name:name,gear==='Sunsteel blade',{custom,role:({Lunara:'Mage',Clover:'Healer',Foxglove:'Rogue'})[name]||heroClass,direction:isPlayer?facing:'down',walking:isPlayer&&performance.now()<walkingUntil,kind:['Awakened','AwakenedCombo'].includes(attackKind)?movePose(activeGeneratedMove):attackKind,attack:isPlayer&&performance.now()-attackStart<activeDuration()?(performance.now()-attackStart)/activeDuration():undefined})
}

const bg=document.createElement('canvas');bg.width=800;bg.height=600;const b=bg.getContext('2d');
function landscape(){drawVolcanic(b)}
landscape();
function draw(){const now=performance.now();ctx.save();if(now<effects.shakeUntil){ctx.clearRect(0,0,800,600);ctx.translate(Math.sin(now)*2,Math.cos(now*1.3)*2)}canvas.style.objectPosition=`${player.x/800*100}% ${player.y/600*100}%`;ctx.drawImage(currentRoom?roomCanvas:atlas.content?regionCanvas:bg,0,0);if(!currentRoom&&atlas.content)drawTaskProps(ctx,atlas.regions[atlas.current],performance.now());if(!currentRoom){for(const actor of encounters.actors)drawEncounter(ctx,actor,encounters.time);if(!atlas.content&&!rowan.hostile&&!rowan.downUntil)pixelText(ctx,'!',rowan.x,rowan.y-31,'#ffec98',23);}if(currentRoom&&regionalHouse)drawHero(ctx,510,280,'#a79665',1,regionalHouse.resident,false,{role:'Healer',direction:'down'});sprite(ctx,player.x,player.y,gear==='Emberweave cloak'?'#b26943':colors[heroClass],1.2,'Evergreen');const awakened=runtime.activeOffer()?.content;if(awakened&&activeGeneratedMove)drawAwakenedMove(ctx,player.x,player.y,activeGeneratedMove,(performance.now()-generatedSkillStart)/awakened.skill.durationMs,generatedDirection);const guidance=worldGuidance();if(guidance.target){const {x,y}=guidance.target;pixelText(ctx,'▼',x,y-35,'#ffe2a0',19);rect(ctx,x-10,y+12,20,2,'#edc67a');}if(!currentRoom&&!atlas.content)atmosphere(ctx,performance.now()/1000);rect(ctx,player.x-12,player.y+19,25,3,'#172325');rect(ctx,player.x-11,player.y+19,22*encounters.hp/encounters.maxHp,2,'#d9df92');if(!currentRoom){drawEncounterSpeech(ctx,encounters.actors,encounters.time);for(const f of encounters.floats)pixelText(ctx,f.text,f.x,f.y-35-(900-f.until+encounters.time)/35,'#ffb383',19);}if(!currentRoom)effects.draw(ctx,now,matchMedia('(prefers-reduced-motion: reduce)').matches);if(frame>0){pixelText(ctx,frameText,player.x,player.y-52-(60-frame)/4,'#fff4b0',20);frame--}ctx.restore()}let frameText='';draw();
const modal=document.querySelector('#modal'),body=document.querySelector('#modalBody');let toastTimer;function toast(t){const el=document.querySelector('#mapToast');el.textContent=t;el.classList.remove('quiet');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('quiet'),4500)}function setLocation(title,subtitle){document.querySelector('.area-label strong').textContent=title;document.querySelector('.area-label span').textContent=subtitle;canvas.setAttribute('aria-label',title+'. Use WASD, arrow keys, or touch controls to move.');}
function move(dir){
 if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open)||performance.now()-attackStart<activeDuration()||performance.now()<effects.freezeUntil)return;
 const oldX=player.x,oldY=player.y;facing=dir;
 const [dx,dy]={up:[0,-12],down:[0,12],left:[-12,0],right:[12,0]}[dir];
 if(!currentRoom&&edgeAt(player,dir,!!atlas.content)){travel(dir);return}
 const house=!currentRoom&&atlas.content&&regionHouseAt(atlas.content,{x:player.x,y:player.y+dy},dir);if(house){regionalHouse=house;currentRoom=house.kind;returnPoint={x:house.door.x,y:house.door.y+16};player={x:400,y:397};encounters.swing=null;encounters.generated=null;drawInterior(roomCanvas.getContext('2d'),currentRoom);setLocation(house.name,atlas.content.name);runtime.record('region_house',`${atlas.current}:${house.id}`,`Entered ${house.name}`,{unique:true});toast(`Find ${house.resident} inside. Press F to talk.`);playSound('menu');draw();return}
 const door=!currentRoom&&!atlas.content&&doorwayAt(player.x,player.y+dy,dir);
 if(door){const visit=runtime.record('room_entered',door.id,`Discovered ${door.name}`);currentRoom=door.id;returnPoint={x:door.x+door.w/2,y:door.y+82};player={x:400,y:397};drawInterior(roomCanvas.getContext('2d'),currentRoom);setLocation(door.name,'CINDERWATCH · INTERIOR');playSound('menu');draw();recordCharacterMoment(visit);return}
 if(currentRoom&&exitAt(player.x,player.y+dy,dir)){player={...returnPoint};currentRoom=null;regionalHouse=null;facing='down';setLocation(atlas.content?.name||'Cinderwatch Outpost',atlas.content?'BEYOND CINDERWATCH':'THE ASHEN REACH');playSound('close');draw();return}
 player=advance(player,dx,dy,currentRoom);
 if(!currentRoom&&witch){const near=({up:player.y<140,down:player.y>470,left:player.x<140,right:player.x>660})[dir],id=neighbor(atlas.current,dir);if(near&&id!=='0,0'&&!atlas.regions[id])witch.prefetch({id,dir})}
 if(player.x!==oldX||player.y!==oldY){walkingUntil=performance.now()+180;playSound('step')}else walkingUntil=0;
 draw();
}

document.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>move(el.dataset.move));document.addEventListener('keydown',e=>{if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open))return;const dir={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'}[e.key];if(dir){e.preventDefault();move(dir)}if(e.code==='Space'||e.key===' '){e.preventDefault();if(!e.repeat)skill('Slash');return}if(e.key.toLowerCase()==='f'){e.preventDefault();if(!e.repeat)requestQuest();return}if(e.key==='5'){e.preventDefault();if(!e.repeat)useAwakening();return}const extra={q:'Heavy',e:'Spin',r:'Bash',Shift:'Dodge'}[e.key];if(extra){e.preventDefault();if(!e.repeat)skill(extra);return}if('124'.includes(e.key))skill({'1':'Slash','2':'Guard','4':'Potion'}[e.key])});function skill(name){
 if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open))return;
 const now=performance.now();
 if(ACTIONS[name]){
   if(now-attackStart<activeDuration()||now<(actionReady[name]||0))return;
   const definition=actionDefinition(name);
   let combo=comboTracker.accept(name,now,definition.duration);if(combo?.generated){if(now<generatedSkillReady){toast('Awakened combo is cooling down.');combo=null}else{actionReady[name]=now+definition.cooldown;launchAwakened(combo.move,true);runtime.record('generated_combo',runtime.activeOffer().id,`Learned ${combo.name}`,{unique:true});toast(combo.name);return}}
   attackKind=combo?combo.id:name;
   if(combo){const learned=runtime.record('combo_learned',combo.id,`Learned ${combo.name}`);recordCharacterMoment(learned,{speak:false});comboNoticeUntil=now+1800;document.querySelector('#comboGuide').hidden=false;document.querySelector('#comboGuide').textContent=`✦ ${combo.name.toUpperCase()}!`;toast(`${combo.name}!`)}
   attackStart=now;lastActionTick=now;actionReady[name]=now+definition.cooldown;
   encounters.begin(attackKind,facing,runtime.state.profile.weapon||'sword',activeDuration());walkingUntil=0;playSound(actionDefinition(attackKind).sound);draw();return;
 }
 if(name==='Potion'){if(encounters.heal()){playSound('Potion');toast('Recovered 40 HP. Potion ready again in 8 seconds.')}else toast('Health full or potion cooling down.');draw();return}if(name==='Guard')encounters.guardUntil=encounters.time+1500;
 comboTracker.reset();playSound(name);frameText='GUARD';frame=60;draw();toast('Guard raised for 1.5 seconds.')
}
document.querySelectorAll('[data-skill]').forEach(el=>el.onclick=()=>skill(el.dataset.skill));
function openView(view){if(dialogue.active)return;if(view==='character'){engineUI.leave();modal.close();creator.open();return}if(view==='inventory'){engineUI.leave();modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='Your satchel';const parcels=Object.values(atlas.regions).flatMap(entry=>regionalTasks(entry.content).filter(t=>regionProgress(entry).carrying.includes(t.id)).map(t=>({t,entry})));body.innerHTML=parcels.length?parcels.map(({t,entry})=>`<div class="journal-entry"><h2>${escapeText(t.label)}</h2><p>${escapeText(taskInstruction(entry,t))}</p></div>`).join(''):'<p class="modal-note">Your satchel is empty. Accepted delivery quests put collected parcels here.</p>';if(!modal.open)modal.showModal();return}engineUI.show(view)}
document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>openView(el.dataset.view));
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close()}});
initSound();
document.fonts.ready.then(()=>{landscape();draw()});
function openMenu(){if(dialogue.active)return;engineUI.leave();comboTracker.reset();playSound('menu');modal.classList.add('start-menu');document.querySelector('#modalTitle').textContent='ADVENTURE';body.innerHTML=`<div class="menu-list"><button data-menu="character">Character <kbd>C</kbd></button><button data-menu="inventory">Bag <kbd>I</kbd></button><button data-menu="journal">Journal <kbd>J</kbd></button><button data-menu="awakening">Awakenings <kbd>U</kbd></button><button data-menu="quests">Quests <kbd>T</kbd></button><button data-menu="combos">Combos <kbd>K</kbd></button><button data-menu="resume">Back to game <kbd>Esc</kbd></button></div><div class="menu-footer"><span>TILTH</span><span>A wish remembers its maker.</span></div>`;body.querySelectorAll('[data-menu]').forEach(el=>el.onclick=()=>showGameView(el.dataset.menu));if(!modal.open)modal.showModal();body.querySelector('button').focus()}
function showGameView(view){if(dialogue.active)return;if(['awakening','quests','journal'].includes(view)){engineUI.show(view);return}engineUI.leave();if(view==='combos'){comboTracker.reset();modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='Combat combos';body.innerHTML='<p class="modal-note">Let each move finish, then use the next skill within 1.6 seconds. The final input becomes a special finisher. Touch buttons work too.</p>'+comboTracker.combos.map(c=>`<div class="journal-entry"><h2>${escapeText(c.name)}</h2><p>${escapeText(c.steps.map(actionName).join(' → '))}<br><b>${escapeText(c.keys)}</b><br>${escapeText(c.description)}</p></div>`).join('')+'<p class="modal-note">Combos deal bonus damage to nearby targets. Face your opponent; walls block attacks.</p>';if(!modal.open)modal.showModal();return}if(view==='resume'){modal.close();return}openView(view)}
document.querySelector('#gameMenu').onclick=openMenu;
modal.addEventListener('cancel',e=>{e.preventDefault();if(modal.classList.contains('start-menu'))modal.close();else openMenu()});
document.querySelector('#closeModal').onclick=()=>{if(modal.classList.contains('start-menu'))modal.close();else openMenu()};
document.addEventListener('keydown',e=>{if((creator?.dialog.open||witch?.dialog.open))return;if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();if(key==='escape'){if(!modal.open){e.preventDefault();openMenu()}return}const view={i:'inventory',c:'character',j:'journal',k:'combos',u:'awakening',t:'quests'}[key];if(view){e.preventDefault();showGameView(view);return}if(modal.open&&modal.classList.contains('start-menu')&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const entries=[...body.querySelectorAll('[data-menu]')];let idx=entries.indexOf(document.activeElement);entries[(idx+(e.key==='ArrowDown'?1:-1)+entries.length)%entries.length].focus()}});
setTimeout(()=>document.querySelector('#mapToast').classList.add('quiet'),4500);

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let lastAmbient=0;let lastGuidance=0;
let lastCharacterTick=0;
function animateScene(now){
 const characterDt=Math.min(50,Math.max(0,now-lastCharacterTick));lastCharacterTick=now;
 const combatActive=!document.hidden&&!modal.open&&!(creator?.dialog.open||witch?.dialog.open)&&!dialogue.active&&!currentRoom;
 if(now>=effects.freezeUntil)encounters.step(characterDt,player,{active:combatActive});else if(combatActive){attackStart+=characterDt;generatedSkillStart+=characterDt;}const burn=effects.curse(atlas.content?.consequence?.kind,player,now,combatActive);if(burn){encounters.hp=Math.max(1,encounters.hp-burn);effects.impact(player.x,player.y,burn,now,reducedMotion.matches);toast('The witch’s embers burn. Keep moving!')}document.querySelector('#healthValue').textContent=`${encounters.hp} / ${encounters.maxHp}`;if(!combatActive){activeGeneratedMove=null;generatedSkillStart=-Infinity;}
 if(combatActive&&!atlas.content)rowan.home=rowanGoal(runtime.state.characterMemory);
 document.querySelector('#awakeningButton').hidden=!runtime.activeOffer()&&!runtime.state.offers.some(o=>o.status==='pending');
 const hp=document.querySelector('.hud-health .health i');if(hp)hp.style.width=`${encounters.hp/encounters.maxHp*100}%`;document.querySelector('.hud-health').setAttribute('aria-label',`Health ${encounters.hp} of ${encounters.maxHp}`);


 if(now-lastGuidance>120){lastGuidance=now;const guidance=worldGuidance(),el=document.querySelector('#questTracker');el.querySelector('strong').textContent=guidance.title;el.querySelector('span').textContent=guidance.text;}

 if(now>comboNoticeUntil){const hint=comboTracker.hint(now);document.querySelector('#comboGuide').hidden=!hint;document.querySelector('#comboGuide').textContent=hint?`${comboTracker.steps.map(actionName).join(' → ')} → ${actionName(hint.steps[comboTracker.steps.length])}  ·  ${comboTracker.steps.length}/3`:'K · COMBO GUIDE'}

 if(attackKind==='Dodge'&&now-attackStart<activeDuration()+100){
   const end=Math.min(now,attackStart+activeDuration()),dt=Math.max(0,end-lastActionTick);lastActionTick=end;
   if(!document.hidden&&!modal.open&&!(creator?.dialog.open||witch?.dialog.open)&&!dialogue.active&&dt){const [dx,dy]={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[facing];player=advance(player,dx*dt*.2,dy*dt*.2,currentRoom);}
 }
 document.querySelectorAll('[data-skill]').forEach(button=>{const name=button.dataset.skill;if(!ACTIONS[name])return;const left=Math.max(0,(actionReady[name]||0)-now);button.style.setProperty('--cooldown',`${left/actionDefinition(name).cooldown*100}%`);button.classList.toggle('cooling',left>0)});
 if(!document.hidden&&(!reducedMotion.matches||combatActive||now<walkingUntil+100||now-attackStart<activeDuration()+100||now-generatedSkillStart<1500)&&now-lastAmbient>40){draw();lastAmbient=now}requestAnimationFrame(animateScene)}requestAnimationFrame(animateScene);

modal.addEventListener('close',()=>playSound('close'));
document.addEventListener('click',e=>{if(e.target.closest('[data-menu], [data-view]'))playSound('select')});
body.addEventListener('focusin',e=>{if(e.target.matches('[data-menu]'))playSound('select')});

document.querySelector('#comboGuide').onclick=()=>showGameView('combos');

function requestQuest(){if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open))return;if(atlas.content){talkRegionalResident();return}if(rowan.hostile||rowan.downUntil){toast(rowan.downUntil?'Rowan is recovering. Give him a moment.':'Rowan is defending himself. Back away and let him calm down.');return}if(currentRoom||Math.hypot(player.x-rowan.x,player.y-rowan.y)>58){dialogue.speak([{speaker:'Evergreen',thought:true,text:currentRoom?'I left Rowan outside by the inn.':'Rowan is over by the inn. I can barely hear him from here.'}]);return}dialogue.speak(rowanConversation(runtime.state.characterMemory),()=>{runtime.requestQuest();engineUI.show('quests')})}
function launchAwakened(move,combo=false){const content=runtime.activeOffer().content,now=performance.now();activeGeneratedMove=move;generatedDirection=facing;generatedSkillStart=now;generatedSkillReady=now+content.skill.cooldownMs;attackKind=combo?'AwakenedCombo':'Awakened';attackStart=now;walkingUntil=0;comboTracker.reset();encounters.beginGenerated(move,facing,content.skill.durationMs);playSound('Rally');draw()}
function useAwakening(){if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open))return;const content=runtime.activeOffer()?.content,now=performance.now();if(!content){toast('Accept an awakening to unlock its skill.');return}if(now-attackStart<activeDuration())return;if(now<generatedSkillReady){toast(`Awakening ready in ${Math.ceil((generatedSkillReady-now)/1000)}s`);return}launchAwakened(awakenedMove(content))}

const generation=new GenerationQueue(runtime,{onStatus:s=>engineUI.setStatus(s)});
engineUI=installGameUI({runtime,queue:generation,modal,body,title:document.querySelector('#modalTitle'),redraw:draw,onUse:useAwakening,onAccept:()=>{playSound('Rally');toast('Awakening accepted. Press 5 to try your new skill.')}});
document.querySelector('#awakeningButton').onclick=()=>engineUI.show('awakening');
document.querySelector('#talkButton').onclick=requestQuest;
generation.connect();

document.querySelector('#questTracker').onclick=()=>engineUI.show('quests');

function refreshCharacter(){
 const profile=runtime.state.profile;heroClass=profile.heroClass;gear=profile.gear||'Ashguard armor';comboTracker.reset();attackStart=-Infinity;for(const key in actionReady)delete actionReady[key];
 document.querySelector('.hud-health>div:first-child>span').textContent=profile.name||'Traveler';
 const icons={sword:'⚔',spear:'↟',bow:'➶',staff:'✦'};
 for(const button of document.querySelectorAll('[data-skill]')){const slot=button.dataset.skill,move=WEAPONS[profile.weapon||'sword'].moves[slot];if(!move)continue;const key={Slash:'Space / 1',Heavy:'Q',Spin:'E',Bash:'R'}[slot];button.title=`${key} · ${move.name}`;button.setAttribute('aria-label',`${move.name} (${key})`);if(slot==='Slash')button.querySelector('span').textContent=icons[profile.weapon||'sword']}
 draw();
}
creator=installOnboarding({runtime,onSave:()=>{refreshCharacter();toast('Your adventure begins. Try your weapon with Space, Q, E, and R.')}});
creator.dialog.addEventListener('close',introduceCharacter);
if(runtime.state.profile.onboarded){refreshCharacter();introduceCharacter()}else creator.open();


function worldGuidance(){if(!atlas.content&&!runtime.state.quests.some(q=>['active','offered'].includes(q.status)))return{title:'What would you ask for?',text:'Follow the northern road to the witch. Your actions shape her answer.',target:{x:400,y:100}};return atlas.content?regionalGuidance(atlas.regions[atlas.current],{room:currentRoom,house:regionalHouse,actors:encounters.actors,homeDirection:atlas.homeDirection()}):nextGuidance(runtime.state,player,currentRoom,rowan)}
function talkRegionalResident(){const entry=atlas.regions[atlas.current],life=regionLife(atlas.content),p=regionProgress(entry);const action=interactRegionalTask(runtime,atlas.current,player,regionalHouse?.id);if(action){setTaskObstacles(regionalObstacles(entry));effects.impact(action.task.x,action.task.y,20,performance.now(),reducedMotion.matches);toast(action.text);playSound('equip');draw();if(action.delivered)dialogue.speak([{speaker:regionalHouse.resident,text:action.text+'. Thank you.'}]);return}if(!currentRoom||!regionalHouse){toast(`Enter ${life.houses[0].name} to speak with ${life.houses[0].resident}.`);return}if(Math.hypot(player.x-510,player.y-280)>75){toast(`Move closer to ${regionalHouse.resident}, at the back of the room.`);return}if(!p.accepted){offerRegionalQuest(runtime,atlas.current);dialogue.speak([{speaker:regionalHouse.resident,text:`${regionalHouse.greeting} ${regionalHouse.request}`}],()=>engineUI.show('quests'));return}const ready=regionalReady(entry);const reward=ready&&completeRegionalObjective(runtime,atlas.current);if(reward){encounters.hp=encounters.maxHp;playSound('victory')}dialogue.speak([{speaker:regionalHouse.resident,text:ready?regionalHouse.thanks:`${regionalHouse.greeting} ${regionalHouse.request}`}]);}

function enterRegion(id,dir){for(const a of encounters.actors){a.revision++;a.attack=null;a.hostile=false}atlas.current=id;effects.reset();const content=atlas.content;setRegionTerrain(content?regionGrid(content):null);setTaskObstacles(content?regionalObstacles(atlas.regions[id]):[]);if(content){drawRegion(regionCanvas.getContext('2d'),content,regionGrid(content));if(!regionActors.has(id)){const p=regionProgress(atlas.regions[id]);const actors=regionLife(content).enemies.map(e=>({...ACTORS[e.kind==='sentry'?5:4],id:`${id}:${e.id}`,foeId:e.id,name:e.name,hp:e.hp,color:e.color,role:e.kind==='mage'?'Mage':e.kind==='sentry'?'Warrior':'Rogue',weapon:e.kind==='mage'?'staff':e.kind==='sentry'?'spear':'sword',warning:e.taunt,relentless:content.consequence?.kind==='restless_patrols',x:e.x*20+10,y:e.y*20,enemy:true}));const created=new Encounters({actors}).actors;for(const a of created)if(p.defeated.includes(a.foeId)){a.hp=0;a.downUntil=Infinity;a.persistentDefeat=true}regionActors.set(id,created)}encounters.actors=regionActors.get(id);setLocation(content.name,content.verdict==='hostile'?'THE WITCH’S REBUKE':'BEYOND CINDERWATCH')}else{encounters.actors=hubActors;setLocation('Cinderwatch Outpost','THE ASHEN REACH')}player=arrival(dir,!content);facing=dir;encounters.swing=null;encounters.generated=null;attackStart=-Infinity;activeGeneratedMove=null;for(const a of encounters.actors){a.attack=null;a.hostile=false;a.ready=encounters.time+1500}playSound('menu');draw()}
function travel(dir){const id=neighbor(atlas.current,dir);if(id==='0,0'||atlas.regions[id]){enterRegion(id,dir);return}if(Object.keys(atlas.regions).length>=16){toast('This world has reached its 16-area exploration limit.');return}witch.open({id,dir})}
witch=installBoundaryWitch({runtime,onEnter:({id,dir},content,events)=>{atlas.add(id,content,events);runtime.state.journal.push({id:crypto.randomUUID(),title:`The witch opened ${content.name}`,summary:content.witchLine,sourceEventIds:content.sourceEventIds,source:'ai',time:Date.now()});runtime.changed();enterRegion(id,dir)}});
