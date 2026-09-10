const text=(max=200)=>({type:'string',minLength:1,maxLength:max});
const integer=(min,max)=>({type:'integer',minimum:min,maximum:max});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const choice=values=>({type:'string',enum:values});
const array=(items,min,max)=>({type:'array',items,minItems:min,maxItems:max});
export const CLASSES=['Warrior','Mage','Rogue','Healer'];
export const COLORS=['#a85d43','#538a9b','#a58b4c','#9b85b3'];
export const CAPACITY=4;
export const SCENE_SCHEMA=object({
 title:text(60),narration:text(650),goal:text(160),theme:choice(['forest','marsh','frost','volcanic']),layout:choice(['grove','ruins','river','caldera','archipelago']),seed:integer(1,999999),
 enemies:array(object({name:text(35),kind:choice(['dragon','skeleton','goblin','slime']),color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},description:text(140)}),0,3),
 landmarks:array(object({name:text(35),kind:choice(['shrine','arch','tower','camp','crystal','well'])}),1,3),
 residents:array(object({name:text(30),role:text(30),home:text(35),color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},greeting:text(300)}),3,3),
 quests:array(object({title:text(55),description:text(240),kind:choice(['delivery','clear','investigate']),giver:integer(0,2),recipient:integer(0,2),landmark:integer(0,2),item:text(40),thanks:text(240)}),2,3),
 suggestions:array(text(100),2,3)
});
export const RULING_SCHEMA=object({kind:choice(['attack','heal','guard','interact','talk']),targetId:text(80),difficulty:choice(['easy','standard','hard']),successText:text(360),failureText:text(240),suggestions:array(text(100),2,3)});
export function matches(schema,value){
 if(schema.type==='object')return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>Object.hasOwn(schema.properties,k))&&schema.required.every(k=>Object.hasOwn(value,k)&&matches(schema.properties[k],value[k]));
 if(schema.type==='array')return Array.isArray(value)&&value.length>=schema.minItems&&value.length<=schema.maxItems&&value.every(v=>matches(schema.items,v));
 if(schema.type==='integer')return Number.isInteger(value)&&value>=schema.minimum&&value<=schema.maximum;
 return typeof value==='string'&&(!schema.minLength||value.length>=schema.minLength)&&(!schema.maxLength||value.length<=schema.maxLength)&&(!schema.enum||schema.enum.includes(value))&&(!schema.pattern||new RegExp(schema.pattern).test(value));
}

export function sceneProblem(scene,chapter){
 if(chapter===1&&scene.enemies.length)return 'The opening must be a safe settlement.';
 if(chapter<3&&scene.enemies.some(e=>e.kind==='dragon'))return 'The dragon belongs to the final chapter.';
 if(chapter===3&&!scene.enemies.some(e=>e.kind==='dragon'))return 'The finale needs its dragon encounter.';
 for(const q of scene.quests){
  if(q.giver>=scene.residents.length||q.recipient>=scene.residents.length||q.landmark>=scene.landmarks.length)return 'A request refers to a missing person or place.';
  if(q.kind==='delivery'&&q.giver===q.recipient)return 'A delivery needs a different recipient.';
 }
 if(chapter===1&&(!scene.quests.some(q=>q.kind==='delivery')||!scene.quests.some(q=>q.kind==='clear')))return 'The opening needs a delivery and a clearing request.';
 return null;
}
