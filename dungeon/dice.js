// The animation never decides a roll. Only the server's published result does.
export class DiceTray {
  constructor(dialog,onRoll) {
    this.dialog=dialog;this.onRoll=onRoll;this.seen=new Set();this.dismissed=new Set();this.primed=false;
    this.$=s=>dialog.querySelector(s);
    this.$('#rollDice').onclick=()=>{
      if(this.phase!=='ready')return;
      this.wait(this.action.actionId,this.player.name,this.label);
      this.onRoll(this.action);
    };
    this.$('#closeDice').onclick=()=>dialog.close();
    this.$('#continueDice').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{if(this.id)this.dismissed.add(this.id);clearInterval(this.animation);dialog.classList.remove('rolling')});
  }
  show() {if(!this.dialog.open)this.dialog.show()}
  prepare(action,player,label,dc) {
    this.action=action;this.player=player;this.id=action.actionId;this.label=label;this.phase='ready';
    this.reset();this.$('#diceEyebrow').textContent='YOUR ACTION';this.$('#diceTitle').textContent=label;
    this.$('#diceNumber').textContent='20';this.$('#diceMath').textContent=`d20 + ${player.bonus}${dc?` · armor ${dc}`:' · difficulty set by the dungeon master'}`;
    this.$('#diceOutcome').textContent='Choose your moment.';this.$('#rollDice').hidden=false;this.$('#continueDice').hidden=true;
    this.show();this.$('#rollDice').focus();
  }
  reset() {
    clearInterval(this.animation);this.dialog.classList.remove('rolling','success','failure');
    this.$('#diceNarration').textContent='';this.$('#diceDetail').textContent='';
    this.$('#rollDice').hidden=true;this.$('#continueDice').hidden=true;
  }
  wait(id,name,label) {
    this.reset();this.id=id;this.phase='waiting';this.$('#diceEyebrow').textContent=`${name.toUpperCase()}’S ACTION`;
    this.$('#diceTitle').textContent=label;this.$('#diceMath').textContent='The dungeon master is resolving the action…';
    this.$('#diceOutcome').textContent='Rolling fate';this.$('#diceNumber').textContent='…';
    this.dialog.classList.add('rolling');this.show();
    // Brief tumble, then a quiet waiting state during the model request.
    let ticks=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduced)this.animation=setInterval(()=>{this.$('#diceNumber').textContent=String((++ticks*7)%20+1);if(ticks>=10){clearInterval(this.animation);this.dialog.classList.remove('rolling');this.$('#diceNumber').textContent='…';this.$('#diceOutcome').textContent='Awaiting the ruling'}},100);
  }
  result(roll) {
    this.reset();this.id=roll.actionId;this.phase='result';this.dialog.classList.add(roll.success?'success':'failure');
    this.$('#diceEyebrow').textContent=`${roll.actorName.toUpperCase()}’S ROLL`;
    this.$('#diceTitle').textContent=`${roll.kind==='interact'?'Inspect':roll.kind[0].toUpperCase()+roll.kind.slice(1)} · ${roll.targetName}`;
    this.$('#diceNumber').textContent=roll.automatic?'✓':String(roll.die);
    this.$('#diceMath').textContent=roll.automatic?'No roll needed':`${roll.die} + ${roll.bonus} = ${roll.total} · target ${roll.dc}`;
    this.$('#diceOutcome').textContent=roll.automatic?'Guard raised':roll.die===20?'Natural 20!':roll.die===1?'Natural 1':roll.success?'Success':'Miss';
    this.$('#diceDetail').textContent=roll.detail;
    this.$('#diceNarration').textContent=roll.narration;this.$('#continueDice').hidden=false;this.show();this.$('#continueDice').focus();
  }
  fail(message) {
    this.reset();this.phase='error';this.$('#diceNumber').textContent='—';this.$('#diceOutcome').textContent='Action unresolved';
    this.$('#diceMath').textContent=message;this.$('#diceNarration').textContent='Check your journal for the result before trying again. An unresolved action does not spend your turn.';
    this.$('#continueDice').hidden=false;
  }
  sync(state) {
    const rolls=state.rolls||[];
    for(const roll of rolls)if(!this.seen.has(roll.id)) {
      this.seen.add(roll.id);
      if((this.primed&&Date.now()-roll.time<12000)||roll.actionId===this.id)this.result(roll);
    }
    this.primed=true;
    const pending=state.pendingRoll;
    if(pending&&pending.kind!=='guard'&&pending.actionId!==this.id&&!this.dismissed.has(pending.actionId))this.wait(pending.actionId,pending.actorName,pending.text);
    if(this.phase==='ready'&&((state.combat!==false&&(state.turn!==this.player.id||state.turnId!==this.action.turnId))||state.busy||state.phase!=='playing')){this.dialog.close();this.phase=null;}
    if(this.phase==='waiting'&&!state.busy&&state.error)this.fail(state.error);
  }
  clear() {this.dialog.close();clearInterval(this.animation);this.seen.clear();this.dismissed.clear();this.primed=false;this.phase=null;this.id=null;}
}
