// Reserve the part of the screen occupied by controls before placing the camera.
export function worldView(width,height,player,{panel=false,panelHeight=0}={}) {
  const mobile=width<=650,scale=mobile?1.5:width>1100?2:1.65;
  const canvasWidth=Math.round(width/scale),canvasHeight=Math.round(height/scale);
  const top=mobile?150:120,bottom=mobile?110:100;
  const right=panel&&!mobile?320:0,extraBottom=panel&&mobile?Math.min(panelHeight,260):0;
  const safe={x:mobile?16:40,y:top,width:Math.max(160,width-right-(mobile?32:80)),height:Math.max(100,height-top-bottom-extraBottom)};
  const focus={x:safe.x+safe.width/2,y:safe.y+safe.height/2};
  // A little map margin at its edges is preferable to hiding the traveler under a panel.
  return {width:canvasWidth,height:canvasHeight,x:(player?.x||400)-focus.x/width*canvasWidth,y:(player?.y||320)-focus.y/height*canvasHeight,focus,safe};
}
