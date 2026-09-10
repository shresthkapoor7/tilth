import {randomBytes,randomInt} from 'node:crypto';
import {CAPACITY,CLASSES,COLORS} from '../dungeon/contracts.js';
import {buildScene,nearestOpen,moveInScene,inRange,pursuitStep} from '../dungeon/world.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const stats={Warrior:{hp:46,bonus:4,range:110,weapon:'sword'},Mage:{hp:32,bonus:4,range:260,weapon:'staff'},Rogue:{hp:36,bonus:3,range:230,weapon:'bow'},Healer:{hp:38,bonus:3,range:240,weapon:'staff'}};
export class DungeonRooms {
 constructor(dm,{clock=Date.now,roll=sides=>randomInt(1,sides+1)}={}){this.dm=dm;this.clock=clock;this.roll=roll;this.rooms=new Map();}
 clean(){for(const [code,r] of this.rooms)if(this.clock()-r.updatedAt>2*60*60*1000&&!r.busy)this.rooms.delete(code)}
 create(input){this.clean();if(this.rooms.size>=100)fail('All tables are occupied. Try again later.',503);let code;do{code=randomBytes(3).toString('hex').toUpperCase()}while(this.rooms.has(code));
  const wish=String(input.wish||'An expedition through old ruins to confront a dragon.').trim();if(wish.length>600)fail('Keep the adventure idea under 600 characters.');
  const r={code,wish,host:null,players:[],phase:'lobby',chapter:0,turn:0,round:1,version:0,busy:false,error:null,scene:null,grid:null,log:[],effects:[],receipts:new Set(),updatedAt:this.clock(),generations:0};
  const seat=this.addPlayer(r,input);r.host=seat.playerId;this.rooms.set(code,r);return {...seat,code};
 }
 addPlayer(r,input){if(r.players.length>=CAPACITY)fail('This room is full (4 players).',409);if(r.phase!=='lobby')fail('This adventure has started. Join a new room.',409);
  const name=String(input.name||'').trim();if(!name||name.length>24)fail('Choose a name of 1–24 characters.');if(!CLASSES.includes(input.heroClass))fail('Choose a supported class.');
  const id=randomBytes(8).toString('hex'),token=randomBytes(24).toString('hex'),s=stats[input.heroClass];r.players.push({id,token,name,heroClass:input.heroClass,color:COLORS[r.players.length],weapon:s.weapon,maxHp:s.hp,hp:s.hp,bonus:s.bonus,range:s.range,heals:input.heroClass==='Healer'?3:1,guard:false,moved:0,lastSeen:this.clock(),x:400,y:400});this.touch(r);return {playerId:id,token};
 }
 join(code,input){const r=this.room(code);return {...this.addPlayer(r,input),code:r.code};}
 room(code){const r=this.rooms.get(String(code).toUpperCase());if(!r)fail('Room not found or expired.',404);return r;}
 authorize(code,token){const r=this.room(code),p=r.players.find(p=>p.token===token);if(!p)fail('Your room session is no longer valid.',401);p.lastSeen=this.clock();r.updatedAt=this.clock();return {r,p};}
 touch(r){r.version++;r.updatedAt=this.clock();}
 log(r,speaker,text,kind='story'){r.log.push({id:randomBytes(6).toString('hex'),speaker,text,kind,time:this.clock()});r.log=r.log.slice(-80);}
 current(r){return r.players[r.turn]||null;}
 snapshot(r,viewer){if(!r.busy&&this.clock()-(r.players.find(p=>p.id===r.host)?.lastSeen||0)>60000){r.host=viewer.id;this.touch(r)}this.skipAbsent(r);return {code:r.code,capacity:CAPACITY,wish:r.wish,host:r.host,you:viewer.id,players:r.players.map(({token,...p})=>({...p,online:this.clock()-p.lastSeen<20000})),phase:r.phase,chapter:r.chapter,round:r.round,turn:this.current(r)?.id,version:r.version,busy:r.busy,error:r.error,scene:r.scene,log:r.log,effects:r.effects,configured:this.dm.configured};}
 skipAbsent(r){if(r.busy||r.phase!=='playing')return;const current=this.current(r);if(!current||current.hp<=0||this.clock()-current.lastSeen>60000){const next=r.players.findIndex(p=>p.hp>0&&this.clock()-p.lastSeen<20000);if(next>=0&&next!==r.turn){r.turn=next;r.players[next].moved=0;this.log(r,'Table',`${r.players[next].name} takes the turn while a companion is away.`,'system');this.touch(r)}}}
 context(r){return {wish:r.wish,chapter:r.chapter,round:r.round,party:r.players.map(({id,name,heroClass,hp,maxHp,x,y})=>({id,name,heroClass,hp,maxHp,x,y})),scene:r.scene,history:r.log.slice(-12).map(({speaker,text})=>({speaker,text}))};}
 launch(r,job){r.busy=true;r.error=null;this.touch(r);r.pending=Promise.resolve().then(job).catch(e=>{r.error=e.name==='TimeoutError'?'The dungeon master took too long. Retry when ready.':e.message;this.log(r,'Table',r.error,'error');}).finally(()=>{r.busy=false;r.pendingKey=null;this.touch(r)});}
 ensureIdle(r){if(r.busy)fail('The dungeon master is resolving an action.',409);}
 begin(r,p){this.ensureIdle(r);if(r.host!==p.id)fail('Only the host can start the adventure.',403);if(!['lobby','cleared'].includes(r.phase))fail('This chapter is already underway.',409);
  this.launch(r,async()=>{const next=r.chapter+1;const data=await this.dm.generate('scene',{...this.context(r),chapter:next});const built=buildScene(data,r.players.length);r.scene=built.scene;r.grid=built.grid;r.chapter=next;r.phase='playing';r.round=1;r.turn=0;r.effects=[];const placed=[];for(const player of r.players){Object.assign(player,nearestOpen(r.grid,{x:400+(placed.length%2)*40,y:410+Math.floor(placed.length/2)*30},placed));placed.push(player);player.hp=Math.min(player.maxHp,player.hp+12);player.guard=false;player.moved=0;player.heals=player.heroClass==='Healer'?3:1;}this.log(r,'Dungeon Master',data.narration);this.log(r,'Table',`Chapter ${next}: defeat the threats and secure one landmark relic.`,'system');});
 }
 leave(r,p){this.ensureIdle(r);const current=this.current(r)?.id;r.players=r.players.filter(v=>v.id!==p.id);if(!r.players.length){this.rooms.delete(r.code);return}if(r.host===p.id)r.host=r.players[0].id;r.turn=Math.max(0,r.players.findIndex(v=>v.id===current));this.log(r,'Table',`${p.name} left the table.`,'system');this.touch(r);}
 target(r,id){return r.scene?.creatures.find(e=>e.id===id)||r.scene?.props.find(e=>e.id===id)||r.players.find(e=>e.id===id);}
 validateAction(r,p,kind,target){
  if(kind==='attack'){if(!r.scene.creatures.includes(target)||target.hp<=0)fail('Choose a living enemy.');if(!inRange(p,target,p.range)||!moveInScene(r.grid,p,target,p.range))fail('Move closer to that enemy first.');}
  if(kind==='heal'){if(!r.players.includes(target)||target.hp<=0)fail('Choose a conscious party member.');if(!p.heals)fail('You have no healing charges left this chapter.');if(target.hp>=target.maxHp)fail('That companion is already at full health.');if(!inRange(p,target,260))fail('Move closer to your companion.');}
  if(kind==='interact'){if(!r.scene.props.includes(target)||target.secured)fail('Choose an unsecured landmark.');if(!inRange(p,target,90))fail('Move closer to inspect that landmark.');}
  if(['guard','talk'].includes(kind)&&target!==p)fail('This action must refer to your own character.');
 }
 act(r,p,input){if(typeof input.actionId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(input.actionId))fail('Missing action ID.');const receipt=`${p.id}:${input.actionId}`;if(r.receipts.has(receipt)||r.pendingKey===receipt)return;this.ensureIdle(r);this.skipAbsent(r);if(r.phase!=='playing'||this.current(r)?.id!==p.id||p.hp<=0)fail('Wait for your turn.',409);
  const kind=input.kind;if(!['move','attack','heal','guard','interact','talk','improvise','end'].includes(kind))fail('Unknown action.');
  if(kind==='move'){const left=100-p.moved,to={x:Number(input.x),y:Number(input.y)},position=moveInScene(r.grid,p,to,left);if(!position)fail('Move up to 100 pixels this turn along clear ground.');if(r.players.some(o=>o!==p&&o.hp>0&&inRange(o,position,18))||r.scene.creatures.some(o=>o.hp>0&&inRange(o,position,20)))fail('That spot is occupied.');p.moved+=Math.hypot(p.x-position.x,p.y-position.y);Object.assign(p,position);r.receipts.add(receipt);this.touch(r);return;}
  if(kind==='end'){r.receipts.add(receipt);this.log(r,'Table',`${p.name} holds position.`,'system');this.finishTurn(r);this.touch(r);return;}
  const text=String(input.text||'').trim();if(text.length>300||(kind==='improvise'&&!text))fail('Describe your action in 1–300 characters.');
  let target=this.target(r,input.targetId||p.id);if(kind!=='improvise')this.validateAction(r,p,kind,target);
  const id=receipt;r.pendingKey=id;this.launch(r,async()=>{
   const ruling=await this.dm.generate('ruling',{...this.context(r),actorId:p.id,intent:{kind,targetId:target?.id||p.id,text},targets:[...r.scene.creatures.filter(e=>e.hp>0),...r.scene.props.filter(e=>!e.secured),...r.players.filter(e=>e.hp>0)].map(({id,name,x,y,hp})=>({id,name,x,y,hp}))});
   if(kind!=='improvise'&&(ruling.kind!==kind||ruling.targetId!==target.id))throw new Error('The ruling changed your selected action. Please retry.');
   target=this.target(r,ruling.targetId);this.validateAction(r,p,ruling.kind,target);
   const die=this.roll(20),dc=ruling.kind==='attack'?target.armor:{easy:8,standard:12,hard:16}[ruling.difficulty],success=ruling.kind==='guard'||(die!==1&&(die===20||die+p.bonus>=dc));
   let detail=`${p.name}: d20 ${die} + ${p.bonus} vs ${dc} · ${success?'success':'miss'}`;
   if(success){
    if(ruling.kind==='attack'){const damage=this.roll(8)+p.bonus+(die===20?6:0);target.hp=Math.max(0,target.hp-damage);detail+=` · ${target.name} −${damage} HP`;this.effect(r,p,target,'attack',damage);}
    if(ruling.kind==='heal'){const amount=Math.min(target.maxHp-target.hp,this.roll(8)+6);target.hp+=amount;p.heals--;detail+=` · ${target.name} +${amount} HP`;this.effect(r,p,target,'heal',amount);}
    if(ruling.kind==='guard'){p.guard=true;detail=`${p.name} guards against the next incoming hit.`;this.effect(r,p,p,'guard',0);}
    if(ruling.kind==='interact'){target.secured=true;detail+=` · secured ${target.name}`;this.effect(r,p,target,'relic',0);}
   }else this.effect(r,p,target||p,'miss',0);
   r.receipts.add(id);this.log(r,p.name,text||`${kind} ${target.name}`,'action');this.log(r,'Dungeon Master',success?ruling.successText:ruling.failureText);this.log(r,'Dice',detail,'roll');r.scene.suggestions=ruling.suggestions;
   this.finishTurn(r);
  });
 }
 effect(r,from,to,kind,amount){r.effects.push({id:randomBytes(6).toString('hex'),from:{x:from.x,y:from.y,id:from.id,creature:from.kind},to:{x:to.x,y:to.y,id:to.id},kind,amount,time:this.clock()});r.effects=r.effects.slice(-16);}
 finishTurn(r){
  if(r.scene.creatures.every(e=>e.hp<=0)&&r.scene.props.some(p=>p.secured)){r.phase=r.chapter>=3?'won':'cleared';this.log(r,'Table',r.phase==='won'?'The final relic is yours. Your party’s expedition is complete.':'Chapter complete. The host can lead the party onward.','system');return;}
  const living=r.players.filter(p=>p.hp>0&&this.clock()-p.lastSeen<60000);if(!living.length){r.phase='lost';this.log(r,'Table','The party falls. The story ends here—for now.','system');return;}
  const old=r.turn;let next=-1;for(let i=1;i<=r.players.length;i++){const idx=(old+i)%r.players.length;if(living.includes(r.players[idx])){next=idx;break}}
  if(next<=old){r.round++;this.enemies(r);}
  if(r.players.every(p=>p.hp<=0)){r.phase='lost';this.log(r,'Table','The party falls. Create a new room to try another expedition.','system');return;}
  r.turn=next;for(let i=0;i<r.players.length&&r.players[r.turn].hp<=0;i++)r.turn=(r.turn+1)%r.players.length;this.current(r).moved=0;
 }
 enemies(r){for(const enemy of r.scene.creatures.filter(e=>e.hp>0)){
  const targets=r.players.filter(p=>p.hp>0);if(!targets.length)break;const target=targets.sort((a,b)=>Math.hypot(a.x-enemy.x,a.y-enemy.y)-Math.hypot(b.x-enemy.x,b.y-enemy.y))[0];
  const range=enemy.kind==='dragon'?200:95;
  if(!inRange(enemy,target,range)||!moveInScene(r.grid,enemy,target,range)){const position=pursuitStep(r.grid,enemy,target);if(position)Object.assign(enemy,position);continue;}
  const die=this.roll(20);if(die+3<11){this.log(r,'Dice',`${enemy.name} misses ${target.name} (d20 ${die}).`,'roll');this.effect(r,enemy,target,'miss',0);continue;}
  const damage=Math.max(1,Math.ceil((this.roll(6)+(enemy.kind==='dragon'?5:2))/(target.guard?2:1)));target.guard=false;target.hp=Math.max(0,target.hp-damage);this.log(r,'Dice',`${enemy.name} ${enemy.kind==='dragon'?'breathes fire on':'hits'} ${target.name} for ${damage}.`,'roll');this.effect(r,enemy,target,enemy.kind==='dragon'?'fire':'attack',damage);
 }}
}
