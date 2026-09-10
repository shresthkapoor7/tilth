// Grounded props use the world's existing pixel scale, materials and lighting.
const palettes={outline:'#182323',shadow:'#0c181b70',wood:'#755039',woodLight:'#ac8052',woodDark:'#44372b',metal:'#89938a',metalLight:'#c1c3a2',metalDark:'#4b5d59',leaf:'#6b8050',leafLight:'#a4ae72',cloth:'#bcaa78'};
const shape=entity=>entity.props.notebookBook?'notebook':entity.props.notebookTarget?'kindling':entity.props.notebookObject?entity.props.notebookKind:entity.props.container?'chest':entity.props.heal?'herbs':entity.props.food?'ration':entity.props.lever?'crowbar':entity.props.leverable?'shutter':entity.props.mechanism?'release':/note|ledger/.test(entity.id)?'note':'stone';
const sizes={chest:[24,19],herbs:[16,15],ration:[16,11],crowbar:[8,21],shutter:[25,30],release:[12,19],note:[12,12],stone:[13,8],notebook:[20,14],kindling:[30,30],water:[12,17],torch:[10,27]};
export function worldObjectBounds(entity){if(entity.kind==='actor')return{left:-18,right:18,top:-45,bottom:18};const[w,h]=sizes[shape(entity)];return{left:-w/2-2,right:w/2+2,top:-h-3,bottom:5};}
function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
export function drawWorldObject(c,entity,selected=false){
 if(entity.kind==='actor'||entity.location.kind!=='ground')return;
 const p=palettes,k=shape(entity),[w]=sizes[k];c.save();c.translate(Math.round(entity.location.x),Math.round(entity.location.y));
 c.fillStyle=p.shadow;c.beginPath();c.ellipse(1,2,w*.6,3,0,0,Math.PI*2);c.fill();
 if(selected){c.strokeStyle='#e3ba72';c.lineWidth=1;c.beginPath();c.ellipse(0,2,w*.65+3,5,0,0,Math.PI*2);c.stroke();}
 // The inn chest is already painted in the room background. Keep its shared
 // entity and selection ring without drawing a second tiny chest over it.
 if(entity.id==='inn-chest'){if(entity.props.open){box(c,-18,-8,36,6,'#15201b');box(c,-15,-7,12,2,p.cloth);}c.restore();return;}
 if(k==='notebook'){
  box(c,-10,-12,20,14,p.outline);box(c,-8,-13,18,12,'#e5d6ad');box(c,-8,-13,2,12,'#a1613e');for(let y=-10;y<-2;y+=3)box(c,-3,y,9,1,'#9d8b64');c.restore();return;
 }
 if(k==='kindling'){
  poly(c,[[-15,-4],[-11,-9],[12,-9],[15,-4],[11,2],[-11,2]],p.outline);poly(c,[[-12,-4],[-9,-7],[10,-7],[12,-4],[9,0],[-9,0]],p.metalDark);
  for(const y of [-6,-3]){box(c,-9,y,18,2,p.wood);box(c,-7,y,9,1,p.woodLight);}
  if(entity.props.wet)box(c,-8,-2,17,2,'#71a9a4');
  if(entity.props.onFire){poly(c,[[-8,-4],[-10,-12],[-4,-26],[-3,-14],[4,-22],[9,-12],[7,-4]],'#d97f37');poly(c,[[-4,-4],[-5,-11],[1,-18],[2,-9],[5,-4]],'#f4cd74');}c.restore();return;
 }
 if(k==='water'){
  box(c,-6,-14,12,16,p.outline);box(c,-4,-13,8,14,'#91b5ac');box(c,-3,-17,6,3,p.metalDark);box(c,-3,-10,1,8,'#e0e7c9');box(c,-4,-2,8,3,'#537e7e');c.restore();return;
 }
 if(k==='torch'){
  box(c,-2,-15,4,17,p.outline);box(c,-1,-14,2,15,p.woodLight);poly(c,[[-4,-14],[-5,-20],[0,-28],[2,-22],[5,-18],[3,-13]],'#d98039');poly(c,[[-2,-15],[0,-23],[3,-16]],'#f2ca6e');c.restore();return;
 }
 if(k==='stone'){
  poly(c,[[-7,-2],[-5,-7],[0,-9],[6,-5],[7,0],[2,2],[-5,1]],p.outline);
  poly(c,[[-5,-3],[-3,-6],[1,-7],[5,-4],[1,-1]],'#838578');poly(c,[[1,-1],[5,-4],[5,0],[1,1],[-4,0]],'#505e57');box(c,-2,-6,3,1,'#b4ac88');
 }else if(k==='herbs'){
  box(c,-2,-10,3,12,p.woodDark);box(c,0,-12,1,12,'#a99b65');
  for(const[x,y,d]of[[-1,-12,-1],[1,-10,1],[-1,-6,-1],[1,-14,1]]){poly(c,[[x,y],[x+d*6,y-3],[x+d*5,y+1],[x,y+3]],p.leaf);box(c,x+d*3,y-1,2,1,p.leafLight);}
  box(c,-3,-3,6,2,'#d0b680');box(c,-1,-1,2,3,p.woodLight);
 }else if(k==='ration'){
  poly(c,[[-8,-7],[-5,-11],[5,-10],[8,-6],[7,0],[-6,1]],p.outline);
  poly(c,[[-6,-7],[-4,-9],[4,-8],[6,-5],[5,-1],[-5,-1]],p.cloth);box(c,-6,-7,11,2,'#dec79b');box(c,-2,-9,2,9,'#806348');box(c,-6,-4,12,1,'#927653');
 }else if(k==='crowbar'){
  poly(c,[[-4,-19],[-1,-22],[3,-21],[4,-18],[2,-16],[0,-17],[-1,-18],[-1,-3],[3,-2],[2,1],[-4,0]],p.outline);
  box(c,-2,-18,2,17,p.metalDark);box(c,-2,-18,1,15,p.metalLight);box(c,-1,-20,3,2,p.metal);box(c,-3,-2,5,2,p.metal);
 }else if(k==='chest'){
  box(c,-12,-13,24,15,p.outline);box(c,-10,-11,20,11,p.wood);box(c,-10,-2,20,2,p.woodDark);box(c,-10,-7,20,1,p.woodDark);
  if(entity.props.open){box(c,-12,-21,24,9,p.outline);box(c,-10,-19,20,5,p.woodDark);box(c,-10,-12,20,4,'#111d1c');box(c,-8,-11,5,1,p.cloth);}else{poly(c,[[-12,-13],[-8,-18],[8,-18],[12,-13]],p.outline);poly(c,[[-9,-13],[-6,-16],[6,-16],[9,-13]],p.woodLight);box(c,-11,-12,22,2,p.woodLight);}
  for(const x of[-8,6]){box(c,x,-12,2,13,p.metalDark);box(c,x,-12,1,12,p.metal);}box(c,-2,-10,4,5,'#c6a468');box(c,-1,-8,2,2,p.woodDark);
 }else if(k==='note'){
  poly(c,[[-6,-11],[4,-12],[7,-8],[5,1],[-6,0]],p.outline);poly(c,[[-4,-10],[3,-10],[5,-7],[3,-1],[-4,-1]],'#d0bd91');box(c,-2,-7,5,1,'#88785a');box(c,-2,-4,4,1,'#88785a');
 }else if(k==='shutter'){
  box(c,-13,-29,26,31,p.outline);box(c,-11,-27,22,27,p.woodDark);
  if(entity.props.open)box(c,-9,-25,18,25,'#101c1d');else{for(let x=-9;x<10;x+=5){box(c,x,-25,4,24,p.wood);box(c,x,-25,1,24,p.woodLight);}box(c,-10,-19,20,2,p.metalDark);box(c,-10,-6,20,2,p.metalDark);box(c,5,-15,3,5,p.metal);}
 }else{
  box(c,-6,-18,12,20,p.outline);box(c,-4,-16,8,16,p.woodDark);box(c,-2,-13,4,9,p.metalDark);box(c,-1,entity.props.active?-7:-14,2,8,p.metalLight);box(c,-3,entity.props.active?-7:-15,6,3,'#b49762');
 }
 c.restore();
}
export function drawWorldObjects(context,state,selected){for(const entity of state.entities||[])drawWorldObject(context,entity,entity.id===selected);}
