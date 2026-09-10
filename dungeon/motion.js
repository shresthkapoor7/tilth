// Time-based interpolation keeps movement consistent across refresh rates.
export function smoothPosition(previous,target,elapsed,{instant=false}={}) {
  if(!previous||instant||Math.hypot(target.x-previous.x,target.y-previous.y)>240)
    return {x:target.x,y:target.y,walking:false};
  const distance=Math.hypot(target.x-previous.x,target.y-previous.y);
  if(distance<.1)return {x:target.x,y:target.y,walking:false};
  const blend=1-Math.exp(-Math.max(0,Math.min(elapsed,100))/70);
  return {x:previous.x+(target.x-previous.x)*blend,y:previous.y+(target.y-previous.y)*blend,walking:distance>.5};
}
