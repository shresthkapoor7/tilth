export class WorldEffects {
 constructor(){this.particles=[];this.freezeUntil=0;this.shakeUntil=0;this.sparks=[];this.lastSpark=0;this.lastBurn=0;this.lastPosition=null;}
 impact(x,y,damage,now,reduced=false){
  for(let i=0;i<(reduced?4:12);i++){const a=i*Math.PI/6;this.particles.push({x,y,vx:Math.cos(a)*35,vy:Math.sin(a)*28,born:now,color:i%2?'#f2bf76':'#df7945'})}
  this.particles=this.particles.slice(-96);
  if(damage>=28&&!reduced){this.freezeUntil=now+55;this.shakeUntil=now+150}
 }
 reset(){this.sparks=[];this.lastPosition=null;this.lastSpark=0;this.lastBurn=0;}
 curse(kind,player,now,active){
  this.sparks=this.sparks.filter(s=>now-s.born<2600);
  if(!active||kind!=='ember_trail'){this.sparks=[];this.lastPosition=null;return 0}
  if(now-this.lastSpark>260&&(!this.lastPosition||Math.hypot(player.x-this.lastPosition.x,player.y-this.lastPosition.y)>8)){
   this.lastSpark=now;this.lastPosition={...player};this.sparks.push({x:player.x,y:player.y+11,born:now});
  }
  if(now-this.lastBurn>=1000&&this.sparks.some(s=>now-s.born>=900&&Math.hypot(s.x-player.x,s.y-player.y-11)<18)){this.lastBurn=now;return 8}
  return 0;
 }
 draw(c,now,reduced=false){
  for(const s of this.sparks){const hot=now-s.born>=900;c.fillStyle=hot?'#ed873ec0':'#edca6855';c.fillRect(s.x-12,s.y-4,24,8);c.fillStyle=hot?'#ffe0a2':'#d5ba6a';c.fillRect(s.x-7,s.y-2,3,hot?7:2);c.fillRect(s.x+5,s.y-5,3,hot?9:2)}
  this.particles=this.particles.filter(p=>now-p.born<450);
  for(const p of this.particles){const t=(now-p.born)/1000;c.fillStyle=p.color;c.globalAlpha=Math.max(0,1-t/.45);c.fillRect(p.x+(reduced?0:p.vx*t),p.y+(reduced?0:p.vy*t+50*t*t),3,3)}c.globalAlpha=1;
 }
}
