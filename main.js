import {regionLife,regionProgress,defeatRegionalEnemy,completeRegionalObjective,regionHouseAt,offerRegionalQuest} from './engine/region-life.js';
import {RegionAtlas,neighbor,edgeAt,arrival,regionGrid,drawRegion} from './engine/regions.js';
import {installBoundaryWitch} from './engine/boundary-witch.js';
import {setRegionTerrain} from './world.js';
import {ACTORS} from './content/encounters.js';
import {awakenedMove,awakenedCombo,movePose,drawAwakenedMove} from './engine/awakened-moves.js';
const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {Encounters} from './engine/encounters.js';
import {WorldSimulation} from './engine/world-simulation.js';
import {WorldController,isTextEntry} from './engine/world-controller.js';
import {installWorldUI,drawWorldObjects} from './engine/world-ui.js';
import {traitsMarkup} from './engine/world-traits.js';
import {drawEncounter,drawEncounterSpeech} from './engine/encounter-renderer.js';
import {createInkStudy,studyMovement} from './engine/ink-study.js';
import {createEnvironmentArt} from './engine/ink-environment.js';
import {createNotebookController} from './engine/notebook-ui.js';
import {installOnboarding} from './engine/onboarding.js';
import {WEAPONS,characterContent,weaponMove} from './content/characters.js';
import {installDialogue} from './engine/dialogue-ui.js';
import {observeCharacterEvent,rowanGoal,rowanWaypoint,rowanConversation} from './engine/character-memory.js';
import {nextGuidance} from './engine/quest-guidance.js';
import {CLASS_COLORS,ITEMS,HOUSES} from './content/game-config.js';
import {GameRuntime} from './engine/runtime.js';
import {GenerationQueue} from './engine/generation.js';
import {installGameUI} from './engine/game-ui.js';
import {drawAttachment} from './engine/generated-renderer.js';
let storage;try{storage=localStorage}catch{}
const runtime=new GameRuntime({storage,automaticQuestFollowups:false});
runtime.automaticQuestFollowups=runtime.state.quests.some(quest=>['active','offered'].includes(quest.status));
let worldController,worldUI;
const atlas=new RegionAtlas(runtime);
const encounters=new Encounters({onProvoked:a=>{const event=runtime.record('combat_hit',a.id,`Struck ${a.name} with ${actionName(attackKind)} in ${atlas.content?.name||'Cinderwatch'}`);if(atlas.content&&a.enemy)encounters.say(a,a.warning);worldController?.observe()},onFeedback:message=>{toast(message);playSound('Heavy')},onDefeated:a=>{if(atlas.content&&a.enemy){a.persistentDefeat=true;defeatRegionalEnemy(runtime,atlas.current,a.foeId)}}});
const rowan=encounters.actors.find(a=>a.id==='rowan');Object.assign(rowan,rowanGoal(runtime.state.characterMemory));rowan.home={x:rowan.x,y:rowan.y};

let creator,witch,notebook;
let engineUI,generatedSkillStart=-Infinity,generatedSkillReady=0,activeGeneratedMove=null,generatedDirection='down';
import {ComboTracker,COMBOS} from './combos.js';
import {ACTIONS} from './combat-visuals.js';
import {advance,doorwayAt,exitAt} from './world.js';
import {drawInterior} from './interiors.js';
import {playSound, initSound} from './sound.js';
import {drawVolcanic, drawHero, atmosphere} from './volcanic.js';
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d');canvas.width=1600;canvas.height=1200;
let player={x:400,y:335}, gear='Ashguard armor', heroClass='Warrior', frame=0;
let attackStart=-Infinity,attackKind='Slash',lastActionTick=0;
const actionReady={};
const comboTracker=new ComboTracker();let comboNoticeUntil=0;
const actionDefinition=name=>['Awakened','AwakenedCombo'].includes(name)?{name:(name==='AwakenedCombo'?runtime.activeOffer()?.content.skill.combo?.name:runtime.activeOffer()?.content.skill.name)||'Awakened move',duration:runtime.activeOffer()?.content.skill.durationMs||600,cooldown:runtime.activeOffer()?.content.skill.cooldownMs||2000,sound:'Rally'}:weaponMove(runtime.state.profile.weapon||'sword',name,ACTIONS[name]);
const actionName=name=>actionDefinition(name)?.name||name;
const activeDuration=()=>actionDefinition(attackKind).duration;
let equippedAwakening;function syncAwakening(){const offer=runtime.activeOffer();if(equippedAwakening===offer?.id)return;equippedAwakening=offer?.id;const combo=awakenedCombo(offer?.content);comboTracker.setCombos([...COMBOS,...(combo?[combo]:[])]);activeGeneratedMove=null;generatedSkillStart=-Infinity;encounters.generated=null;}runtime.subscribe(syncAwakening);syncAwakening();
let facing='down', walkingUntil=0, currentRoom=null, returnPoint=null,regionalHouse=null;
const studyRequested=new URLSearchParams(location.search).get('art')==='ink',heldDirections=new Set();let studyLaunched=false;
const inkStudy=createInkStudy({onChange:()=>draw(),onEnter:()=>openInkStudy(),getProfile:()=>characterContent(runtime.state.profile)});
const environmentArt=createEnvironmentArt({onChange:()=>draw()});
window.addEventListener('keyup',e=>{const dir={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'}[e.key];heldDirections.delete(dir)});
window.addEventListener('blur',()=>heldDirections.clear());document.addEventListener('visibilitychange',()=>heldDirections.clear());
const regionCanvas=document.createElement('canvas');regionCanvas.width=800;regionCanvas.height=600;
const hubActors=encounters.actors,regionActors=new Map();
const roomCanvas=document.createElement('canvas');roomCanvas.width=800;roomCanvas.height=600;
const colors=CLASS_COLORS;
const dialogue=installDialogue({speakerLabel:speaker=>speaker==='Evergreen'?(runtime.state.profile.name||'Evergreen'):speaker,drawPortrait(c,speaker){if(speaker==='Evergreen'&&inkStudy.portrait(c))return;c.clearRect(0,0,120,120);const custom=speaker==='Evergreen'&&runtime.state.profile.onboarded?characterContent(runtime.state.profile):undefined;if(custom)drawAttachment(c,60,78,3,{appearance:custom.characterArt});drawHero(c,60,78,speaker==='Rowan'?'#96815b':colors[heroClass],3,undefined,false,{custom,direction:'down',role:speaker==='Rowan'?'Warrior':heroClass})},sound:()=>playSound('select')});
function recordCharacterMoment(event,{speak=true}={}){const result=observeCharacterEvent(runtime.state.characterMemory,event,{room:currentRoom,player,rowan});runtime.state.characterMemory=result.memory;runtime.changed();if(speak)dialogue.speak(result.lines)}
function introduceCharacter(){if(runtime.state.profile.onboarded&&!runtime.state.characterMemory.introduced){runtime.state.characterMemory.introduced=true;runtime.changed();dialogue.speak([{speaker:'Evergreen',thought:true,text:'That man by the inn keeps looking this way. Maybe he knows somewhere I can stay.'}])}}

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
function landscape(){environmentArt.setLayout(drawVolcanic(b))}
landscape();
const simulation=new WorldSimulation({saved:runtime.state.worldSimulation,mover:(p,dx,dy,room)=>advance(p,dx,dy,atlas.content?currentRoom:room)});
const restoredWorld=simulation.restoreBindings({player,actors:encounters.actors,encounters});
if(restoredWorld)facing=({north:'up',south:'down',east:'right',west:'left'})[simulation.state.actors.player.facing]||facing;
if(restoredWorld?.room&&!restoredWorld.room.startsWith('region:')){currentRoom=restoredWorld.room;returnPoint=runtime.state.worldPosition?.returnPoint||{x:400,y:335};drawInterior(roomCanvas.getContext('2d'),currentRoom);}
if(restoredWorld?.room?.startsWith('region:'))player={x:400,y:335};
function worldSnapshot(){player.direction=facing;return{player,room:atlas.content?`region:${atlas.current}:${currentRoom||'outside'}`:currentRoom,returnPoint,actors:atlas.content?[]:encounters.actors,profile:runtime.state.profile,hp:encounters.hp,maxHp:encounters.maxHp};}
function currentGuidance(){const state=simulation.publicState(),goal=state.objective;const target=goal?.status==='complete'?null:state.entities.find(e=>e.id===(state.player.evidence.some(e=>e.category==='care'&&e.id.includes('clover'))&&state.actors.find(a=>a.id==='clover')?.fatigue<60?'rowan':'clover'))?.location;return{title:goal?.title||'Help Clover and earn Rowan’s support',text:goal?.step||'Speak with Clover. A meaningful favor can open a new path.',target:target?.kind==='ground'?target:null};}
function draw(){
 const studyRoom=currentRoom==='inn';inkStudy.setRoom(currentRoom);environmentArt.setRoom(atlas.content&&!currentRoom?'generated':currentRoom);
 canvas.style.objectPosition=`${player.x/800*100}% ${player.y/600*100}%`;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.setTransform(studyRoom?3:2,0,0,studyRoom?3:2,studyRoom?-400:0,studyRoom?-240:0);
 ctx.imageSmoothingEnabled=inkStudy.active||environmentArt.active;
 const originalPlayer=()=>sprite(ctx,player.x,player.y,gear==='Emberweave cloak'?'#b26943':colors[heroClass],1.2,'Evergreen');
 if(inkStudy.active){
  const now=performance.now();inkStudy.drawRoom(ctx,{...player,facing,moving:now<walkingUntil,time:now,attack:now-attackStart<activeDuration()?(now-attackStart)/activeDuration():undefined,kind:attackKind,weapon:runtime.state.profile.weapon||'sword',reduced:matchMedia('(prefers-reduced-motion: reduce)').matches},originalPlayer,()=>{const custom=runtime.state.profile.onboarded?characterContent(runtime.state.profile):undefined;if(custom)drawAttachment(ctx,player.x,player.y,1.2,{appearance:custom.characterArt});drawAttachment(ctx,player.x,player.y,1.2,runtime.activeOffer()?.content)},()=>drawWorldObjects(ctx,simulation.publicState(),worldUI?.selected));
 }else{
  if((atlas.content&&!currentRoom)||!environmentArt.draw(ctx,currentRoom))ctx.drawImage(currentRoom?roomCanvas:atlas.content?regionCanvas:bg,0,0);
  drawWorldObjects(ctx,simulation.publicState(),worldUI?.selected);if(!currentRoom){for(const actor of encounters.actors)drawEncounter(ctx,actor,encounters.time);if(!atlas.content&&!rowan.hostile&&!rowan.downUntil)pixelText(ctx,'!',rowan.x,rowan.y-31,'#ffec98',23)}
  if(currentRoom&&regionalHouse)drawHero(ctx,510,280,'#a79665',1,regionalHouse.resident,false,{role:'Healer',direction:'down'});
  originalPlayer();
 }
 const awakened=runtime.activeOffer()?.content;if(awakened&&activeGeneratedMove)drawAwakenedMove(ctx,player.x,player.y,activeGeneratedMove,(performance.now()-generatedSkillStart)/awakened.skill.durationMs,generatedDirection);
 const guidance=worldGuidance();
 if(guidance.target){const {x,y}=guidance.target;pixelText(ctx,'▼',x,y-35,inkStudy.active?'#9e654a':'#ffe2a0',19);rect(ctx,x-10,y+12,20,2,inkStudy.active?'#b48472':'#edc67a')}
 if(!currentRoom&&!atlas.content)atmosphere(ctx,performance.now()/1000);
 if(!inkStudy.active){rect(ctx,player.x-12,player.y+19,25,3,'#172325');rect(ctx,player.x-11,player.y+19,22*encounters.hp/encounters.maxHp,2,'#d9df92')}
 if(!currentRoom){drawEncounterSpeech(ctx,encounters.actors,encounters.time);for(const f of encounters.floats)pixelText(ctx,f.text,f.x,f.y-35-(900-f.until+encounters.time)/35,'#ffb383',19)}
 if(frame>0){pixelText(ctx,frameText,player.x,player.y-52-(60-frame)/4,inkStudy.active?'#423253':'#fff4b0',20);frame--}
}let frameText='';draw();
function portrait(){let c=document.querySelector('#portrait').getContext('2d');c.clearRect(0,0,100,80);rect(c,20,66,62,4,'#d2d9be');drawHero(c,49,52,colors[heroClass],2.2,'',gear==='Sunsteel blade',{role:heroClass,custom:runtime.state.profile.onboarded?characterContent(runtime.state.profile):undefined})}portrait();
const modal=document.querySelector('#modal'),body=document.querySelector('#modalBody');let toastTimer;function toast(t){const el=document.querySelector('#mapToast');el.textContent=t;el.classList.remove('quiet');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('quiet'),4500)}function setLocation(title,subtitle){document.querySelector('.area-label strong').textContent=title;document.querySelector('.area-label span').textContent=subtitle;canvas.setAttribute('aria-label',title+'. Use WASD, arrow keys, or touch controls to move.');}
function enterInterior(door){const visit=runtime.record('room_entered',door.id,`Discovered ${door.name}`);currentRoom=door.id;returnPoint={x:door.x+door.w/2,y:door.y+82};player={x:400,y:397};heldDirections.clear();drawInterior(roomCanvas.getContext('2d'),currentRoom);setLocation(door.name,'CINDERWATCH · INTERIOR');playSound('menu');draw();recordCharacterMoment(visit);worldController?.observe()}
function openInkStudy(){if(dialogue.active||(creator?.dialog.open||witch?.dialog.open||notebook?.active))return;modal.close();heldDirections.clear();if(atlas.content){currentRoom=null;regionalHouse=null;enterRegion('0,0','down')}if(currentRoom!=='inn')enterInterior(HOUSES.find(h=>h.id==='inn'));else draw();}
function move(dir,amount=12,quiet=false){
 if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open||notebook?.active)||performance.now()-attackStart<activeDuration())return;
 const oldX=player.x,oldY=player.y;if(!quiet)facing=dir;
 const [dx,dy]={up:[0,-amount],down:[0,amount],left:[-amount,0],right:[amount,0]}[dir];
 if(!currentRoom&&edgeAt(player,dir,!!atlas.content)){travel(dir);return}
 const house=!currentRoom&&atlas.content&&regionHouseAt(atlas.content,{x:player.x,y:player.y+dy},dir);if(house){regionalHouse=house;currentRoom=house.kind;returnPoint={x:house.door.x,y:house.door.y+16};player={x:400,y:397};encounters.swing=null;encounters.generated=null;drawInterior(roomCanvas.getContext('2d'),currentRoom);setLocation(house.name,atlas.content.name);runtime.record('region_house',`${atlas.current}:${house.id}`,`Entered ${house.name}`,{unique:true});toast(`Find ${house.resident} inside. Press F to talk.`);playSound('menu');draw();return}
 const door=!currentRoom&&!atlas.content&&doorwayAt(player.x,player.y+dy,dir);
 if(door){enterInterior(door);return}
 if(currentRoom&&exitAt(player.x,player.y+dy,dir)){player={...returnPoint};currentRoom=null;regionalHouse=null;heldDirections.clear();facing='down';setLocation(atlas.content?.name||'Cinderwatch Outpost',atlas.content?'BEYOND CINDERWATCH':'THE ASHEN REACH');playSound('close');worldController?.observe();draw();return}
 player=advance(player,dx,dy,currentRoom);
 if(player.x!==oldX||player.y!==oldY){walkingUntil=performance.now()+180;playSound('step')}else walkingUntil=0;
 worldController?.observe();if(!quiet)draw();
}

document.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>move(el.dataset.move));document.addEventListener('keydown',e=>{if(isTextEntry(e.target)||e.ctrlKey||e.metaKey||e.altKey)return;if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open||notebook?.active))return;const dir={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'}[e.key];if(dir){e.preventDefault();if(currentRoom==='inn'){if(!e.repeat){move(dir,3);heldDirections.add(dir)}return}move(dir)}if(e.code==='Space'||e.key===' '){e.preventDefault();if(!e.repeat)skill('Slash');return}if(e.key.toLowerCase()==='f'){e.preventDefault();if(!e.repeat)requestQuest();return}if(e.key==='5'){e.preventDefault();if(!e.repeat)useAwakening();return}const extra={q:'Heavy',e:'Spin',r:'Bash',Shift:'Dodge'}[e.key];if(extra){e.preventDefault();if(!e.repeat)skill(extra);return}if('1234'.includes(e.key))skill(['Slash','Guard','Rally','Potion'][+e.key-1])});function skill(name){
 if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open||notebook?.active))return;
 const now=performance.now();
 if(ACTIONS[name]){
   if(now-attackStart<activeDuration()||now<(actionReady[name]||0))return;
   const definition=actionDefinition(name);
   let combo=comboTracker.accept(name,now,definition.duration);if(combo?.generated){if(now<generatedSkillReady){toast('Awakened combo is cooling down.');combo=null}else{actionReady[name]=now+definition.cooldown;launchAwakened(combo.move,true);runtime.record('generated_combo',runtime.activeOffer().id,`Learned ${combo.name}`,{unique:true});toast(combo.name);return}}
   attackKind=combo?combo.id:name;
   if(combo){const learned=runtime.record('combo_learned',combo.id,`Learned ${combo.name}`);recordCharacterMoment(learned,{speak:false});comboNoticeUntil=now+1800;document.querySelector('#comboGuide').textContent=`✦ ${combo.name.toUpperCase()}!`;toast(`${combo.name}!`)}
   attackStart=now;lastActionTick=now;actionReady[name]=now+definition.cooldown;
   encounters.begin(attackKind,facing,runtime.state.profile.weapon||'sword',activeDuration());walkingUntil=0;playSound(actionDefinition(attackKind).sound);draw();return;
 }
 if(name==='Potion'){if(encounters.heal()){playSound('Potion');toast('Recovered 40 HP. Potion ready again in 8 seconds.')}else toast('Health full or potion cooling down.');draw();return}if(name==='Guard')encounters.guardUntil=encounters.time+1500;
 comboTracker.reset();playSound(name);frameText={Guard:'+ DEFENSE',Rally:'+ STRENGTH',Potion:'+ 40 HP'}[name];frame=60;draw();toast(`${name} · animation preview`)
}
document.querySelectorAll('[data-skill]').forEach(el=>el.onclick=()=>skill(el.dataset.skill));
const items=ITEMS;
function openView(view){if(dialogue.active||notebook?.active)return;if(view==='character'){engineUI.leave();modal.close();creator.open();return}if(view==='journal'){engineUI.show('journal');return}engineUI.leave();if(!modal.open)playSound('menu');modal.classList.remove('start-menu');if(view==='world'){modal.close();return}document.querySelector('#modalTitle').textContent={inventory:'A pack full of possibilities',character:'Meet Evergreen',journal:'Your story so far'}[view];if(view==='inventory'){body.innerHTML=`<p class="modal-note">Try on a blade, armor, or cloak to change your village sprite. Equipment and stats are a visual preview.</p><div class="inventory-grid">${items.map(([icon,name,rarity])=>`<button class="item ${gear===name?'equipped':''}" data-item="${name}"><span class="item-icon">${icon}</span><b>${name}</b><small>${gear===name?'✓ Equipped':rarity}</small></button>`).join('')}</div>`;body.querySelectorAll('[data-item]').forEach(el=>el.onclick=()=>{if(['Sunsteel blade','Ashguard armor','Emberweave cloak'].includes(el.dataset.item)){playSound('equip');gear=el.dataset.item;runtime.setProfile({gear,...(gear==='Sunsteel blade'?{weapon:'sword'}:gear==='Ashguard armor'?{clothing:'Armor'}:{clothing:'Coat',outfitColor:'#b26943'})});refreshCharacter();openView('inventory')}else{body.querySelector('.modal-note').textContent=el.dataset.item==='Health potion'?'Health potion · Restores 40 HP. Consumables are a visual preview.':`${el.dataset.item} · Slot preview. Try the blade, armor, or cloak to see your character change.`}})};if(!modal.open)modal.showModal()}
document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>openView(el.dataset.view));document.querySelector('#closeModal').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){let r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close()}});document.querySelector('#trackQuest').onclick=()=>worldUI.focus();document.querySelector('#mapInfo').onclick=()=>toast(atlas.content?atlas.content.description:'Cinderwatch · Caldera to the north, magma to the east');
initSound();
let bossHP=100,battleAnimation=null,battleEffect='';
function beginBattleAction(actor,kind,effect){const weapon=actor==='player'?(runtime.state.profile.weapon||'sword'):'staff';const definition=weaponMove(weapon,kind,ACTIONS[kind]);battleAnimation={actor,kind,start:performance.now(),duration:definition.duration,weapon};battleEffect=effect;playSound(definition.sound);drawBattle();}
function battle(){if(dialogue.active)return;engineUI.leave();playSound('battle');modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='The Cinderbound Warden';body.innerHTML='<canvas id="battleCanvas" width="500" height="260" aria-label="Front-facing pixel battle preview"></canvas><p class="battle-log">Your party stands together.</p><div class="battle-actions"><button class="primary" id="attack">⚔ Power strike</button><button class="outline" id="heal">✚ Party heal</button></div><p class="modal-note">Staged encounter · Class synergy and combat visuals only.</p>';modal.showModal();bossHP=100;battleAnimation=null;battleEffect='';drawBattle();document.querySelector('#attack').textContent=actionName('Heavy');document.querySelector('#attack').onclick=()=>{if(battleAnimation&&performance.now()-battleAnimation.start<battleAnimation.duration)return;bossHP=Math.max(0,bossHP-25);beginBattleAction('player','Heavy','- 128');body.querySelector('.battle-log').textContent=bossHP?`Power strike! Guardian vitality: ${bossHP}%`:'Victory! + 350 XP · Preview complete';if(!bossHP){playSound('victory');document.querySelector('#attack').disabled=true}};document.querySelector('#heal').onclick=()=>{if(battleAnimation&&performance.now()-battleAnimation.start<battleAnimation.duration)return;beginBattleAction('healer','Spin','+ 64 HP');body.querySelector('.battle-log').textContent='Clover casts Renewal. The whole party is healed.'}}
function drawBattle(){const effect=battleEffect;const c=document.querySelector('#battleCanvas').getContext('2d');rect(c,0,0,500,260,'#242e2e');c.drawImage(bg,560,0,240,220,0,0,500,115);rect(c,0,110,500,150,'#373e36');function oval(x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}oval(345,155,87,21,'#141f21');oval(345,151,79,17,'#62634e');rect(c,320,99,49,48,'#353c37');rect(c,312,100,17,31,'#6a6251');rect(c,364,100,17,31,'#6a6251');rect(c,326,72,37,34,'#534e40');rect(c,323,71,44,9,'#865136');rect(c,329,66,9,9,'#d17e36');rect(c,354,62,6,15,'#d17e36');rect(c,332,87,6,5,'#ffc66d');rect(c,351,87,6,5,'#ffc66d');rect(c,328,144,14,11,'#333b35');rect(c,352,144,14,11,'#333b35');rect(c,301,49,88,5,'#5b6747');rect(c,302,50,86*bossHP/100,3,'#e9a052');pixelText(c,'CINDERBOUND WARDEN',345,39,'#fcf5cf',14);[['player',75,190,heroClass,runtime.state.profile.weapon||'sword'],['mage',150,175,'Mage','staff'],['rogue',205,217,'Rogue','bow'],['healer',275,221,'Healer','staff']].forEach(([actor,x,y,role,weapon])=>{
 oval(x,y+12,32,9,'#64634d');
 const progress=battleAnimation?.actor===actor?(performance.now()-battleAnimation.start)/battleAnimation.duration:undefined;
 const custom=actor==='player'&&runtime.state.profile.onboarded?characterContent(runtime.state.profile):undefined;
 if(actor==='player'){if(custom)drawAttachment(c,x,y,1.5,{appearance:custom.characterArt});drawAttachment(c,x,y,1.5,runtime.activeOffer()?.content)}
 drawHero(c,x,y,colors[role],1.5,'',actor==='player'&&gear==='Sunsteel blade',{role,custom:custom||{...characterContent({heroClass:role}),weapon,outfitColor:colors[role],clothing:role==='Mage'||role==='Healer'?'Robe':'Coat'},direction:'right',kind:battleAnimation?.kind,attack:progress>=0&&progress<1?progress:undefined});
 });if(effect){const elapsed=battleAnimation?performance.now()-battleAnimation.start:0;if(elapsed<1400)pixelText(c,effect,effect.startsWith('-')?345:180,(effect.startsWith('-')?69:139)-Math.min(18,elapsed/60),'#fff1bb',26)}}document.querySelector('#battleOpen').onclick=battle;
document.fonts.ready.then(()=>{landscape();draw()});
function openMenu(){if(dialogue.active||notebook?.active)return;engineUI.leave();comboTracker.reset();playSound('menu');modal.classList.add('start-menu');document.querySelector('#modalTitle').textContent='ADVENTURE';body.innerHTML=`<div class="menu-list"><button data-menu="character">Character <kbd>C</kbd></button><button data-menu="traits">Traits</button><button data-menu="inventory">Bag <kbd>I</kbd></button><button data-menu="party">Party <kbd>P</kbd></button><button data-menu="journal">Journal <kbd>J</kbd></button><button data-menu="awakening">Awakenings <kbd>U</kbd></button><button data-menu="quests">Quests <kbd>T</kbd></button><button data-menu="combos">Combos <kbd>K</kbd></button><button data-menu="battle">Battle preview <kbd>B</kbd></button><button data-menu="resume">Back to game <kbd>Esc</kbd></button></div><div class="menu-footer"><span>◆ ${simulation.state.actors.player.coins}</span><span>Cinderwatch</span></div>`;body.querySelectorAll('[data-menu]').forEach(el=>el.onclick=()=>showGameView(el.dataset.menu));if(!modal.open)modal.showModal();body.querySelector('button').focus()}
function showGameView(view){if(dialogue.active||notebook?.active)return;if(['awakening','quests','journal'].includes(view)){engineUI.show(view);return}engineUI.leave();if(view==='traits'){modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='Your traits';body.innerHTML=traitsMarkup(simulation.publicState());if(!modal.open)modal.showModal();return}if(view==='combos'){comboTracker.reset();modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='Combat combos';body.innerHTML='<p class="modal-note">Let each move finish, then use the next skill within 1.6 seconds. The final input becomes a special finisher. Touch buttons work too.</p>'+comboTracker.combos.map(c=>`<div class="journal-entry"><h2>${escapeText(c.name)}</h2><p>${escapeText(c.steps.map(actionName).join(' → '))}<br><b>${escapeText(c.keys)}</b><br>${escapeText(c.description)}</p></div>`).join('')+'<p class="modal-note">Combos deal bonus damage to nearby targets. Face your opponent; walls block attacks.</p>';if(!modal.open)modal.showModal();return}if(view==='resume'){modal.close();return}if(view==='battle'){battle();return}if(view==='party'){modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='Your party';body.innerHTML='<div class="party-panel">'+document.querySelector('.party').innerHTML+'</div>';if(!modal.open)modal.showModal();return}openView(view)}
document.querySelector('#gameMenu').onclick=openMenu;
modal.addEventListener('cancel',e=>{e.preventDefault();if(modal.classList.contains('start-menu'))modal.close();else openMenu()});
document.querySelector('#closeModal').onclick=()=>{if(modal.classList.contains('start-menu'))modal.close();else openMenu()};
document.addEventListener('keydown',e=>{if(isTextEntry(e.target))return;if((creator?.dialog.open||witch?.dialog.open||notebook?.active))return;if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();if(key==='escape'){if(!modal.open){e.preventDefault();openMenu()}return}const view={i:'inventory',c:'character',j:'journal',p:'party',b:'battle',k:'combos',u:'awakening',t:'quests'}[key];if(view){e.preventDefault();showGameView(view);return}if(modal.open&&modal.classList.contains('start-menu')&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const entries=[...body.querySelectorAll('[data-menu]')];let idx=entries.indexOf(document.activeElement);entries[(idx+(e.key==='ArrowDown'?1:-1)+entries.length)%entries.length].focus()}});
setTimeout(()=>document.querySelector('#mapToast').classList.add('quiet'),4500);

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let lastAmbient=0;let lastGuidance=0;
let lastCharacterTick=0;
function animateScene(now){
 notebook?.tick();
 const characterDt=Math.min(50,Math.max(0,now-lastCharacterTick));lastCharacterTick=now;
 if(document.hidden||modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open||notebook?.active))heldDirections.clear();
 if(currentRoom==='inn'&&heldDirections.size){const v=studyMovement(heldDirections,characterDt);if(!heldDirections.has(facing))facing=v.y?(v.y>0?'down':'up'):(v.x>0?'right':'left');if(v.x)move(v.x>0?'right':'left',Math.abs(v.x),true);if(currentRoom==='inn'&&v.y)move(v.y>0?'down':'up',Math.abs(v.y),true);if(v.x||v.y)draw();}
 const combatActive=!document.hidden&&!modal.open&&!(creator?.dialog.open||witch?.dialog.open||notebook?.active)&&!dialogue.active&&!currentRoom;
 encounters.step(characterDt,player,{active:combatActive});if(!combatActive){activeGeneratedMove=null;generatedSkillStart=-Infinity;}
 if(combatActive&&!atlas.content)rowan.home=rowanGoal(runtime.state.characterMemory);
 const hp=document.querySelector('.hud-health .health i');if(hp)hp.style.width=`${encounters.hp/encounters.maxHp*100}%`;document.querySelector('.hud-health').setAttribute('aria-label',`Health ${encounters.hp} of ${encounters.maxHp}`);


 if(now-lastGuidance>120){lastGuidance=now;worldController?.observe();worldUI?.render();const guidance=worldGuidance(),el=document.querySelector('#questTracker');el.querySelector('strong').textContent=guidance.title;el.querySelector('span').textContent=guidance.text;}

 if(now>comboNoticeUntil){const hint=comboTracker.hint(now);document.querySelector('#comboGuide').textContent=hint?`${comboTracker.steps.map(actionName).join(' → ')} → ${actionName(hint.steps[comboTracker.steps.length])}  ·  ${comboTracker.steps.length}/3`:'K · COMBO GUIDE'}

 if(attackKind==='Dodge'&&now-attackStart<activeDuration()+100){
   const end=Math.min(now,attackStart+activeDuration()),dt=Math.max(0,end-lastActionTick);lastActionTick=end;
   if(!document.hidden&&!modal.open&&!(creator?.dialog.open||witch?.dialog.open||notebook?.active)&&!dialogue.active&&dt){const [dx,dy]={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[facing];player=advance(player,dx*dt*.2,dy*dt*.2,currentRoom);}
 }
 document.querySelectorAll('[data-skill]').forEach(button=>{const name=button.dataset.skill;if(!ACTIONS[name])return;const left=Math.max(0,(actionReady[name]||0)-now);button.style.setProperty('--cooldown',`${left/actionDefinition(name).cooldown*100}%`);button.classList.toggle('cooling',left>0)});
 if(!document.hidden&&document.querySelector('#battleCanvas')&&battleAnimation&&now-battleAnimation.start<1500)drawBattle();
 if(!document.hidden&&(!reducedMotion.matches||combatActive||now<walkingUntil+100||now-attackStart<activeDuration()+100||now-generatedSkillStart<1500)&&now-lastAmbient>40){draw();lastAmbient=now}requestAnimationFrame(animateScene)}requestAnimationFrame(animateScene);

modal.addEventListener('close',()=>playSound('close'));
document.addEventListener('click',e=>{if(e.target.closest('[data-menu], [data-view]'))playSound('select')});
body.addEventListener('focusin',e=>{if(e.target.matches('[data-menu]'))playSound('select')});

document.querySelector('#comboGuide').onclick=()=>showGameView('combos');

function requestQuest(){if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open||notebook?.active))return;if(atlas.content){talkRegionalResident();return}worldUI.select('rowan');worldController.direct('interact','rowan');}
function launchAwakened(move,combo=false){const content=runtime.activeOffer().content,now=performance.now();activeGeneratedMove=move;generatedDirection=facing;generatedSkillStart=now;generatedSkillReady=now+content.skill.cooldownMs;attackKind=combo?'AwakenedCombo':'Awakened';attackStart=now;walkingUntil=0;comboTracker.reset();encounters.beginGenerated(move,facing,content.skill.durationMs);playSound('Rally');draw()}
function useAwakening(){if(modal.open||dialogue.active||(creator?.dialog.open||witch?.dialog.open||notebook?.active))return;const content=runtime.activeOffer()?.content,now=performance.now();if(!content){toast('Accept an awakening to unlock its skill.');return}if(now-attackStart<activeDuration())return;if(now<generatedSkillReady){toast(`Awakening ready in ${Math.ceil((generatedSkillReady-now)/1000)}s`);return}launchAwakened(awakenedMove(content))}

const generation=new GenerationQueue(runtime,{onStatus:s=>{engineUI.setStatus(s);notebook?.setProviderStatus(s)}});
engineUI=installGameUI({runtime,queue:generation,modal,body,title:document.querySelector('#modalTitle'),redraw:draw,onUse:useAwakening,onAccept:()=>{playSound('Rally');toast('Awakening accepted. Press 5 to try your new skill.')}});
document.querySelector('#awakeningButton').onclick=()=>engineUI.show('awakening');
document.querySelector('#talkButton').onclick=requestQuest;
generation.connect();

document.querySelector('#questTracker').onclick=()=>worldUI.focus();

function refreshCharacter(){
 const profile=runtime.state.profile;heroClass=profile.heroClass;gear=profile.gear||'Ashguard armor';comboTracker.reset();attackStart=-Infinity;for(const key in actionReady)delete actionReady[key];
 document.querySelector('.character h2').textContent=profile.name||'Evergreen';document.querySelector('.character>.muted').textContent=`${heroClass} · The Wanderer`;const partyName=document.querySelector('.party-row b');partyName.replaceChildren(document.createTextNode(profile.name||'Evergreen'));const you=document.createElement('small');you.textContent='YOU';partyName.append(you);document.querySelector('.party-row div>span').textContent=`Lv. 12 ${heroClass}`;document.querySelector('.hud-health>div:first-child>span').textContent=profile.name||'Evergreen';
 document.querySelector('.hud-health').setAttribute('aria-label',`${profile.name||'Evergreen'}, level 12. Health 240 of 280. Mana 85 of 100.`);
 const icons={sword:'⚔',spear:'↟',bow:'➶',staff:'✦'};
 for(const button of document.querySelectorAll('[data-skill]')){const slot=button.dataset.skill,move=WEAPONS[profile.weapon||'sword'].moves[slot];if(!move)continue;const key={Slash:'Space / 1',Heavy:'Q',Spin:'E',Bash:'R'}[slot];button.title=`${key} · ${move.name}`;button.setAttribute('aria-label',`${move.name} (${key})`);if(slot==='Slash')button.querySelector('span').textContent=icons[profile.weapon||'sword']}
 inkStudy.refreshProfile();portrait();draw();
}
creator=installOnboarding({runtime,onSave:()=>{refreshCharacter();toast('Your adventure begins. Try your weapon with Space, Q, E, and R.')}});
creator.dialog.addEventListener('close',()=>{if(!studyRequested)introduceCharacter()});
function beginStudy(){if(studyRequested&&!studyLaunched&&runtime.state.profile.onboarded){studyLaunched=true;inkStudy.ready.then(()=>openInkStudy());return true}return false}
creator.dialog.addEventListener('close',beginStudy);
if(runtime.state.profile.onboarded){refreshCharacter();if(!beginStudy())introduceCharacter()}else creator.open();
worldController=new WorldController({simulation,runtime,snapshot:worldSnapshot,playerView:()=>worldUI?.playerView()??simulation.view('player'),canReact:()=>runtime.state.profile.onboarded&&!document.hidden&&!modal.open&&!creator.dialog.open&&!witch?.dialog.open&&!notebook?.active&&!atlas.content&&!dialogue.active,applyPhysical:world=>{encounters.hp=world.actors.player.hp;facing=({north:'up',south:'down',east:'right',west:'left'})[world.actors.player.facing]||facing;},changed:result=>{for(const event of result?.events||[]){if(event.kind==='speech'){const speaker=encounters.actors.find(a=>a.id===event.actor);if(speaker)encounters.say(speaker,event.data?.speech||event.text);}else if(event.kind==='take'||event.kind==='give')playSound('equip');else if(event.kind==='heal'||event.kind==='eat')playSound('heal');else if(event.kind==='impact')playSound('Heavy');else if(event.kind==='open'||event.kind==='inspect')playSound('menu');}worldUI?.render();draw();}});
notebook=createNotebookController({runtime,simulation,controller:worldController,getScene:()=>({room:atlas.content?null:currentRoom,player}),dialogue,redraw:draw,busy:()=>modal.open||dialogue.active||creator?.dialog.open||witch?.dialog.open,onPause:()=>heldDirections.clear()});
worldUI=installWorldUI({controller:worldController,simulation,canvas,camera:()=>({scale:currentRoom==='inn'?3:2,x:currentRoom==='inn'?-400:0,y:currentRoom==='inn'?-240:0,width:800,height:600,fit:currentRoom==='inn'?'contain':'cover',anchor:currentRoom==='inn'?{x:.5,y:.5}:undefined}),onNotebook:()=>notebook?.show(),player:()=>player,redraw:draw,sound:playSound,showJournal:()=>engineUI.show('journal'),showTraits:()=>showGameView('traits')});
worldController.observe();worldUI.render();worldController.connect();
window.addEventListener('pagehide',()=>{simulation.sync(worldSnapshot());worldController.persist();});
function worldGuidance(){if(atlas.content){const life=regionLife(atlas.content),p=regionProgress(atlas.regions[atlas.current]);if(p.rewarded)return{title:'Area secured',text:`${atlas.homeDirection()?.toUpperCase()} · Return toward Cinderwatch, or explore another edge.`,target:null};if(!p.accepted)return{title:p.offered?'A quest awaits your decision':'Meet the residents',text:p.offered?'Press T to review and accept the local quest.':currentRoom?`Speak to ${regionalHouse?.resident} · F to talk.`:`Enter ${life.houses[0].name} to ask about a task.`,target:p.offered?null:currentRoom?{x:510,y:280}:life.houses[0].door};const foe=encounters.actors.find(a=>a.enemy&&!p.defeated.includes(a.foeId));if(currentRoom)return{title:life.objective.title,text:foe?`${p.defeated.length}/${life.enemies.length} defeated · Leave the house to fight the patrols.`:`Report to ${regionalHouse?.resident} · F to talk.`,target:foe?null:{x:510,y:280}};return{title:life.objective.title,text:foe?`${p.defeated.length}/${life.enemies.length} defeated · Find ${foe.name}.`:`Patrols defeated · Enter ${life.houses[0].name} and report back.`,target:foe||life.houses[0].door}}return currentGuidance()}
function talkRegionalResident(){const entry=atlas.regions[atlas.current],life=regionLife(atlas.content),p=regionProgress(entry);if(!currentRoom||!regionalHouse){toast(`Enter ${life.houses[0].name} to speak with ${life.houses[0].resident}.`);return}if(Math.hypot(player.x-510,player.y-280)>75){toast(`Move closer to ${regionalHouse.resident}, at the back of the room.`);return}if(!p.accepted){offerRegionalQuest(runtime,atlas.current);dialogue.speak([{speaker:regionalHouse.resident,text:`${regionalHouse.greeting} ${regionalHouse.request}`}],()=>engineUI.show('quests'));return}const ready=p.defeated.length===life.enemies.length;const reward=ready&&completeRegionalObjective(runtime,atlas.current);if(reward){encounters.hp=encounters.maxHp;playSound('victory')}dialogue.speak([{speaker:regionalHouse.resident,text:ready?regionalHouse.thanks:`${regionalHouse.greeting} ${regionalHouse.request}`}]);}

function enterRegion(id,dir){for(const a of encounters.actors){a.revision++;a.attack=null;a.hostile=false}atlas.current=id;const content=atlas.content;setRegionTerrain(content?regionGrid(content):null);if(content){drawRegion(regionCanvas.getContext('2d'),content,regionGrid(content));if(!regionActors.has(id)){const p=regionProgress(atlas.regions[id]);const actors=regionLife(content).enemies.map(e=>({...ACTORS[e.kind==='sentry'?5:4],id:`${id}:${e.id}`,foeId:e.id,name:e.name,hp:e.hp,color:e.color,role:e.kind==='mage'?'Mage':e.kind==='sentry'?'Warrior':'Rogue',weapon:e.kind==='mage'?'staff':e.kind==='sentry'?'spear':'sword',warning:e.taunt,x:e.x*20+10,y:e.y*20,enemy:true}));const created=new Encounters({actors}).actors;for(const a of created)if(p.defeated.includes(a.foeId)){a.hp=0;a.downUntil=Infinity;a.persistentDefeat=true}regionActors.set(id,created)}encounters.actors=regionActors.get(id);setLocation(content.name,content.verdict==='hostile'?'THE WITCH’S REBUKE':'BEYOND CINDERWATCH')}else{encounters.actors=hubActors;setLocation('Cinderwatch Outpost','THE ASHEN REACH')}player=arrival(dir,!content);facing=dir;heldDirections.clear();currentRoom=null;regionalHouse=null;encounters.swing=null;encounters.generated=null;attackStart=-Infinity;activeGeneratedMove=null;for(const a of encounters.actors){a.attack=null;a.hostile=false;a.ready=encounters.time+1500}worldController?.observe();worldUI?.render();playSound('menu');draw()}
function travel(dir){const id=neighbor(atlas.current,dir);if(id==='0,0'||atlas.regions[id]){enterRegion(id,dir);return}if(Object.keys(atlas.regions).length>=16){toast('This world has reached its 16-area exploration limit.');return}witch.open({id,dir})}
witch=installBoundaryWitch({runtime,onEnter:({id,dir},content,events)=>{atlas.add(id,content,events);runtime.state.journal.push({id:crypto.randomUUID(),title:`The witch opened ${content.name}`,summary:content.witchLine,sourceEventIds:content.sourceEventIds,source:'ai',time:Date.now()});runtime.changed();enterRegion(id,dir)}});
