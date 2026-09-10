import {regionLife} from '../engine/region-life.js';
const R=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))};
const P=(c,points,col)=>{c.fillStyle=col;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()};
const palettes={
 forest:{ground:['#284530','#304e34','#345038'],grass:'#526c3e',path:'#817458',pathLight:'#9b8962',water:'#244f59',shore:'#729783',leaf:'#466d3a',leafLight:'#789749',leafDark:'#234b30',stone:'#687362',wall:'#9b9a78',roof:'#8c4a37'},
 marsh:{ground:['#344635','#3b4c38','#3d4c35'],grass:'#758052',path:'#797254',pathLight:'#aaa071',water:'#26494a',shore:'#688677',leaf:'#596c36',leafLight:'#99a35b',leafDark:'#334b2e',stone:'#718071',wall:'#9b9572',roof:'#4c7264'},
 frost:{ground:['#9aafa5','#a6b8aa','#a1b2a8'],grass:'#7b978b',path:'#809487',pathLight:'#b9c6af',water:'#2d6172',shore:'#c4ded2',leaf:'#345f50',leafLight:'#bcd5c2',leafDark:'#254940',stone:'#718e86',wall:'#97a196',roof:'#627b73'},
 volcanic:{ground:['#303b35','#394039','#3c4036'],grass:'#62624a',path:'#766a53',pathLight:'#a08b61',water:'#324e50',shore:'#778373',leaf:'#575e38',leafLight:'#a1884c',leafDark:'#303f31',stone:'#667267',wall:'#80866f',roof:'#684637'},
};
function random(seed){return()=>{seed=Math.imul(seed||1,1664525)+1013904223;return(seed>>>0)/4294967296}}
function cluster(c,x,y,rx,ry,color){for(let yy=-ry;yy<=ry;yy+=3){const w=Math.floor(Math.sqrt(Math.max(0,1-yy*yy/(ry*ry)))*rx/3)*3;R(c,x-w,y+yy,w*2,3,color)}}
function tree(c,x,y,p,r,theme){
 const h=38+Math.floor(r()*14);R(c,x-15,y+3,34,5,'#122b2660');R(c,x-4,y-18,9,26,'#1d3027');R(c,x-2,y-20,4,25,'#755d39');R(c,x+1,y-14,2,18,'#9b7b47');
 if(theme==='volcanic'&&r()>.55){P(c,[[x-2,y-8],[x-10,y-35],[x-17,y-40],[x-15,y-44],[x-6,y-38],[x-4,y-h],[x+1,y-h-5],[x+2,y-30],[x+11,y-39],[x+14,y-48],[x+17,y-46],[x+15,y-33],[x+3,y-19],[x+2,y]],'#23372d');R(c,x-2,y-35,2,27,'#657052');return}
 const lobes=theme==='frost'?[[0,-h,11,10],[-2,-h+12,18,10],[0,-h+24,25,12]]:[[-13,-h+15,16,14],[11,-h+8,20,16],[0,-h-2,18,14],[0,-h+22,26,16]];
 for(const [dx,dy,rx,ry] of lobes){cluster(c,x+dx,y+dy,rx+2,ry+2,'#1e382c');cluster(c,x+dx,y+dy-2,rx,ry,p.leafDark);cluster(c,x+dx-2,y+dy-5,rx-2,ry-3,p.leaf);cluster(c,x+dx-5,y+dy-9,rx-7,ry-7,p.leafLight);}
 for(let i=0;i<24;i++){const dx=r()*42-21,dy=-h+r()*32;R(c,x+dx,y+dy,2+r()*3,2,i%3?p.leaf:p.leafLight)}
}
function boulder(c,x,y,p,r){
 const h=10+r()*10,w=8+r()*4;R(c,x-w-3,y+2,w*2+7,4,'#172c2660');P(c,[[x-w,y],[x-w+2,y-h+4],[x-1,y-h],[x+w,y-h+5],[x+w+2,y+4],[x-w,y+4]],'#263e34');P(c,[[x-w+2,y-1],[x-w+4,y-h+4],[x-1,y-h+2],[x+w-2,y-h+6],[x+w,y+1]],p.stone);P(c,[[x-w+4,y-h+4],[x-1,y-h+2],[x+5,y-h+5],[x-5,y-h+7]],'#a7aa88');R(c,x-6,y,8,2,p.grass);R(c,x+3,y-9,2,7,'#40574a');
}
function house(c,h,p,theme,index){
 const x=h.x*20+10,y=h.y*20+40,roof=theme==='frost'?p.roof:[p.roof,'#71613f','#436359'][index%3];
 P(c,[[x-49,y-62],[x+55,y-70],[x+70,y+8],[x-34,y+15]],'#122b2855');
 R(c,x-52,y-76,104,80,'#263e35');R(c,x-49,y-72,98,72,p.wall);R(c,x-49,y-70,98,8,'#4b5d48');R(c,x+41,y-65,8,62,'#6b765c');
 for(let row=0;row<7;row++){const yy=y-64+row*9;R(c,x-48,yy,95,1,'#626f55');for(let col=0;col<7;col++){const xx=x-47+col*15+(row%2?7:0);if(xx<x+47)R(c,xx,yy,1,9,'#626f55');if(col%3===row%3)R(c,xx+2,yy+2,9,1,'#bfbb8e')}}
 for(const dx of [-48,43]){R(c,x+dx,y-74,5,75,'#394e3a');R(c,x+dx+1,y-70,2,68,'#798168')}
 P(c,[[x-61,y-76],[x-43,y-110],[x+40,y-110],[x+62,y-76]],'#1f352c');
 P(c,[[x-56,y-78],[x-39,y-106],[x+38,y-106],[x+57,y-78]],roof);
 for(let row=0;row<4;row++){const yy=y-105+row*7,left=x-40-row*4,right=x+39+row*4;R(c,left,yy,right-left,1,theme==='frost'?'#c4d8c5':'#c18b57');for(let xx=left+5+(row%2)*4;xx<right;xx+=11)R(c,xx,yy+1,1,5,'#293e3455')}
 R(c,x-61,y-76,123,5,'#23372c');R(c,x-60,y-75,121,2,'#a79768');
 if(theme==='frost'){P(c,[[x-43,y-111],[x+40,y-111],[x+45,y-104],[x+7,y-105],[x-10,y-102],[x-48,y-104]],'#dce5cd');R(c,x-53,y-80,103,3,'#c5d9c5')}
 R(c,x+24,y-123,12,27,'#3a4b3e');R(c,x+25,y-121,9,24,p.stone);for(let j=0;j<4;j++)R(c,x+25,y-120+j*6,9,1,'#a5a989');R(c,x+22,y-125,16,4,'#354b40');
 for(const dx of [-34,23]){R(c,x+dx-2,y-53,18,26,'#344838');R(c,x+dx,y-51,14,22,'#5b452c');R(c,x+dx+2,y-49,10,17,'#daa65b');R(c,x+dx+3,y-49,3,14,'#f8d182');R(c,x+dx+6,y-51,2,23,'#70573b');R(c,x+dx,y-41,14,2,'#7d5e3b');R(c,x+dx-3,y-28,20,4,'#465c41');for(let i=0;i<5;i++)R(c,x+dx-1+i*4,y-29-(i%2)*2,3,3,theme==='frost'?'#cfddcb':'#6b8950')}
 R(c,x-13,y-37,27,37,'#253b2d');R(c,x-10,y-34,21,34,'#795334');for(let j=0;j<4;j++)R(c,x-9+j*5,y-31,1,30,'#a17a49');R(c,x-9,y-28,19,2,'#4b422d');R(c,x-9,y-10,19,2,'#4b422d');R(c,x+6,y-19,2,3,'#e9c477');R(c,x-16,y,34,4,'#b4ad81');R(c,x-20,y+4,42,4,'#586c51');
 R(c,x-22,y-41,4,13,'#273a2e');R(c,x-24,y-39,8,9,'#ba7b3c');R(c,x-22,y-38,4,6,'#f8d280');
 // Stacked logs and a rain barrel sit outside the solid footprint, off the doorway.
 for(let i=0;i<3;i++){R(c,x-47+i*9,y-5-(i%2)*6,11,8,'#4f442e');R(c,x-46+i*9,y-4-(i%2)*6,4,6,'#b39861')}
 R(c,x+35,y-16,17,19,'#342f23');R(c,x+37,y-17,13,18,'#8f7449');R(c,x+36,y-13,15,2,'#3f4a38');R(c,x+36,y-3,15,2,'#3f4a38');
 c.font='12px VT323,monospace';c.textAlign='center';c.fillStyle='#112c28';c.fillText(h.name,x+1,y-133);c.fillStyle='#efe1b7';c.fillText(h.name,x,y-134);
}
function landmark(c,m,p,index){
 const x=m.x*20+10,y=m.y*20;R(c,x-29,y+6,58,7,'#18372d65');
 if(m.kind==='well'){
  for(let j=0;j<3;j++){R(c,x-24+j*2,y-5+j*5,48-j*4,5,p.stone);R(c,x-23+j*2,y-5+j*5,45-j*4,1,'#a7ac8b')}
  R(c,x-18,y-10,36,8,'#182f2b');R(c,x-15,y-8,30,4,p.water);R(c,x-25,y-38,5,37,'#5b4b30');R(c,x+20,y-38,5,37,'#5b4b30');R(c,x-27,y-39,54,5,'#947747');R(c,x,y-38,1,30,'#b6a36a');R(c,x-4,y-10,9,7,'#8b7750');P(c,[[x-35,y-42],[x,y-59],[x+35,y-42]],'#345448');R(c,x-35,y-42,70,3,'#9ba579');
 }else if(m.kind==='arch'){
  for(const dx of [-24,16]){R(c,x+dx,y-48,9,56,'#284235');R(c,x+dx+1,y-47,7,52,p.stone);for(let j=0;j<6;j++)R(c,x+dx+1,y-44+j*8,7,1,'#b1b292')}
  R(c,x-27,y-55,55,9,'#324f40');R(c,x-25,y-54,51,6,p.stone);R(c,x-22,y-53,45,1,'#c2bd96');R(c,x-4,y-55,9,11,'#a89f6a');
 }else if(m.kind==='tower'){
  R(c,x-21,y-68,44,76,'#30493b');R(c,x-18,y-65,37,70,p.stone);for(let j=0;j<8;j++){R(c,x-18,y-62+j*8,37,1,'#425b46');for(let i=0;i<4;i++)R(c,x-17+i*10+(j%2)*4,y-62+j*8,1,7,'#425b46')}
  for(let i=0;i<4;i++)R(c,x-23+i*13,y-78,10,13,p.stone);R(c,x-24,y-67,49,4,'#9d9e7c');R(c,x-5,y-52,11,18,'#263e31');R(c,x-3,y-51,7,14,'#d5b368');R(c,x-7,y-19,15,24,'#3b3e2c');
 }else if(m.kind==='camp'){
  P(c,[[x-27,y+4],[x-3,y-36],[x+24,y+4]],'#415a3d');P(c,[[x-23,y+2],[x-3,y-32],[x+18,y+2]],'#b38851');P(c,[[x-8,y+3],[x-3,y-23],[x+6,y+3]],'#2a3d2f');R(c,x-29,y+3,57,3,'#dbc08a');R(c,x+30,y,17,4,'#4b402c');P(c,[[x+32,y],[x+36,y-14],[x+40,y-6],[x+44,y]],'#ed9550');R(c,x+36,y-5,4,6,'#f8cf7a');
 }else if(m.kind==='crystal'){for(const [dx,h] of [[-13,24],[0,43],[13,21]]){P(c,[[x+dx-7,y],[x+dx-5,y-h],[x+dx+1,y-h-7],[x+dx+8,y-h+2],[x+dx+5,y+3]],'#83c5ad');P(c,[[x+dx+1,y-h-7],[x+dx+8,y-h+2],[x+dx+5,y+3]],'#d7e5b6')}}
 else{R(c,x-25,y+4,50,5,p.stone);R(c,x-20,y-1,40,5,'#a4a782');R(c,x-15,y-29,6,28,p.stone);R(c,x+9,y-29,6,28,p.stone);R(c,x-18,y-34,36,7,p.stone);R(c,x-15,y-34,30,2,'#bcbc95');R(c,x-5,y-21,10,20,'#c0b774');R(c,x-2,y-18,4,14,'#ece2a7');}
 c.textAlign='center';c.font='12px VT323';c.fillStyle='#f0e2b3';c.fillText(m.name,x,y+29);
}
export function drawScenery(c,content,grid,layers=[]){
 const sprite=(x,y,width,height,type,draw)=>{const image=document.createElement('canvas');image.width=width;image.height=height;const context=image.getContext('2d');context.translate(width/2-x,height-20-y);draw(context);layers.push({image,x:x-width/2,y:y-height+20,depth:y,type,cx:x,cy:y})};
 const p=palettes[content.theme]||palettes.forest,r=random(content.seed),props=[];
 for(let y=0;y<30;y++)for(let x=0;x<40;x++){
  const k=grid[y][x],px=x*20,py=y*20;
  R(c,px,py,20,20,k==='path'?p.path:k==='water'?p.water:k==='lava'?'#bc4a28':p.ground[Math.floor(r()*3)]);
  for(let i=0;i<9;i++)R(c,px+r()*19,py+r()*19,1+r()*2,1,i%2?'#d3dcaa15':'#122b251f');
  if(k==='path'){
   if((x+y)%3!==0){const xx=px+3+r()*5,yy=py+3+r()*6;R(c,xx,yy,8+r()*5,5,'#615e482b');R(c,xx,yy,8+r()*5,1,p.pathLight)}
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])if(grid[y+dy]?.[x+dx]==='ground')for(let i=0;i<3;i++)R(c,px+(dx?dx>0?18:0:r()*18),py+(dy?dy>0?18:0:r()*18),2,2,p.grass);
  }
  if(k==='ground'&&r()>.68){const xx=px+r()*15,yy=py+r()*15;R(c,xx,yy,1,4,p.grass);R(c,xx-2,yy+1,1,2,p.grass);R(c,xx+2,yy-1,1,4,p.grass);if(r()>.8&&content.theme!=='volcanic')R(c,xx,yy-1,2,2,r()>.5?'#d4b67b':'#c6d79d')}
  if(k==='water'||k==='lava'){
   for(let i=0;i<3;i++)R(c,px+r()*8,py+3+i*6,5+r()*10,1,k==='lava'?'#ffb85b':'#75aeaa');
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])if(![k,'bridge'].includes(grid[y+dy]?.[x+dx])){R(c,px+(dx===1?17:0),py+(dy===1?17:0),dx?3:20,dy?3:20,k==='lava'?'#e18445':p.shore);}
  }
  if(k==='bridge'){R(c,px,py,20,20,'#253d33');for(let i=0;i<4;i++){R(c,px,py+i*5,20,4,'#91774d');R(c,px+1,py+i*5,18,1,'#c2a275');R(c,px+2,py+i*5+1,1,2,'#374839')}}
  if(k==='trees')props.push({type:k,x:px+10+r()*4,y:py+16});
  if(k==='rock')props.push({type:k,x:px+8+r()*6,y:py+16});
 }
 for(const prop of props.sort((a,b)=>a.y-b.y)){sprite(prop.x,prop.y,80,96,prop.type,ctx=>{if(prop.type==='trees')tree(ctx,prop.x,prop.y,p,r,content.theme);else boulder(ctx,prop.x,prop.y,p,r)})}
 for(const [i,h] of regionLife(content).houses.entries())sprite(h.x*20+10,h.y*20+40,190,180,'house',ctx=>house(ctx,h,p,content.theme,i));
 content.landmarks.forEach((m,i)=>sprite(m.x*20+10,m.y*20+12,140,116,'landmark',ctx=>landmark(ctx,m,p,i)));return layers;
}
export function drawTask(c,prop,active,now){
 if(prop.secured)return;const {x,y}=prop;
 if(prop.kind==='debris'){
  R(c,x-20,y+4,42,5,'#172b2866');P(c,[[x-19,y+3],[x-18,y-9],[x-6,y-15],[x+10,y-10],[x+17,y+5]],'#354b3d');P(c,[[x-16,y-8],[x-5,y-13],[x+10,y-9],[x+3,y-3]],'#9b9c7a');
  for(const [xx,yy,w] of [[-20,-2,27],[-8,4,30],[-12,-6,22]]){R(c,x+xx,y+yy,w,4,'#665036');R(c,x+xx+1,y+yy,w-2,1,'#af8850')}
 }else if(prop.kind==='clue'){R(c,x-8,y-7,17,12,'#514b33');R(c,x-6,y-9,12,13,'#d5c78c');for(let i=0;i<3;i++)R(c,x-4,y-6+i*3,8,1,'#887347')}
 if(active){c.font='16px VT323';c.textAlign='center';c.fillStyle='#f7d48b';c.fillText('◆',x,y-25-Math.round(Math.sin(now/350)*2));}
}
export function villageAmbience(c,scene,now){
 const p=palettes[scene.theme]||palettes.forest;
 for(let i=0;i<12;i++){const x=(i*137+Math.sin(now/1900+i)*8)%800,y=(i*73+now/170)%600;R(c,x,y,1,1,scene.theme==='volcanic'?'#efa654':scene.theme==='frost'?'#e4e9d2':'#a3bb714a')}
 for(const h of scene.homes||[]){const x=h.x*20+37,y=h.y*20-88;for(let j=0;j<3;j++){const t=(now/1800+j*.35)%1;cluster(c,x+Math.sin(t*4+j)*6,y-t*22,3+t*4,2+t*3,`rgba(183,191,162,${.18*(1-t)})`)}}
}

// Decorative, impassable woodland beyond the play area keeps camera edges natural.
export function drawWilderness(c,theme,seed){
 const p=palettes[theme]||palettes.forest,r=random(seed+981);
 R(c,-400,-400,1600,1400,p.ground[0]);
 for(let y=-390;y<1000;y+=14)for(let x=-390;x<1200;x+=14){R(c,x+r()*12,y+r()*12,2,1,p.grass)}
 for(let y=-320;y<990;y+=38)for(let x=-350;x<1190;x+=39){if(x>-38&&x<825&&y>-24&&y<632)continue;tree(c,x+r()*18,y+r()*16,p,r,theme)}
}
