// A bounded object/rule adapter, not a second room simulation.
// All positions and collision remain in Tilth's existing room/furniture data.
export const NOTEBOOK_LIMITS=Object.freeze({objects:4,laws:4,effectsPerUse:4,brief:600});
export const NOTEBOOK_ANCHOR=Object.freeze({room:'inn',x:381,y:304});
export const KINDLING_ANCHOR=Object.freeze({room:'inn',x:426,y:312});
export const OBJECT_KINDS=Object.freeze({water:{tags:['liquid'],appearance:'water',label:'Water vessel'},torch:{tags:['heatSource','wood'],appearance:'torch',label:'Torch'},stone:{tags:['stone'],appearance:'stone',label:'Stone'}});
const str=maxLength=>({type:'string',minLength:1,maxLength});
const enumeration=values=>({type:'string',enum:values});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const NOTEBOOK_SCHEMAS={
 notebook_object:obj({name:str(32),description:str(180),kind:enumeration(Object.keys(OBJECT_KINDS))}),
 notebook_law:obj({name:str(40),summary:str(180),trigger:enumeration(['Used']),subjectTag:enumeration(['liquid','heatSource','stone']),targetTag:enumeration(['flammable']),effect:obj({op:enumeration(['setStatus']),status:enumeration(['onFire','wet']),value:enumeration(['set','clear'])})})
};
export const NOTEBOOK_EXAMPLES=Object.freeze({
 notebook_object:{name:'A jar of rain',description:'Cool water caught far from the ash.',kind:'water'},
 notebook_law:{name:'Rain remembers',summary:'Using a liquid on flammable material puts out its fire.',trigger:'Used',subjectTag:'liquid',targetTag:'flammable',effect:{op:'setStatus',status:'onFire',value:'clear'}}
});
const copy=value=>structuredClone(value);
const exact=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[<>\u0000-\u001f]/.test(v);
export function validateNotebookContent(kind,value){
 if(kind==='notebook_object'){
  if(!exact(value,['name','description','kind'])||!text(value.name,32)||!text(value.description,180)||!Object.hasOwn(OBJECT_KINDS,value.kind))throw new Error('Objects need a name, description, and a supported water vessel, torch, or stone form.');
 }else if(kind==='notebook_law'){
  if(!exact(value,['name','summary','trigger','subjectTag','targetTag','effect'])||!text(value.name,40)||!text(value.summary,180)||value.trigger!=='Used'||!['liquid','heatSource','stone'].includes(value.subjectTag)||value.targetTag!=='flammable'||!exact(value.effect,['op','status','value'])||value.effect.op!=='setStatus'||!['onFire','wet'].includes(value.effect.status)||!['set','clear'].includes(value.effect.value))throw new Error('This page supports one use-triggered fire or wetness change on flammable material.');
 }else throw new Error('Unknown notebook page.');
 return copy(value);
}
export const NOTEBOOK_ID='inn-notebook';
export const KINDLING_ID='inn-kindling';
export function notebookReachable({room,player}={}){return room==='inn'&&Number.isFinite(player?.x)&&Number.isFinite(player?.y)&&Math.hypot(player.x-400,player.y-346)<=62;}
