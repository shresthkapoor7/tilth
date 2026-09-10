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
 enemies:array(object({name:text(35),kind:choice(['dragon','skeleton','goblin','slime']),color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},description:text(140)}),1,3),
 landmarks:array(object({name:text(35),kind:choice(['shrine','arch','tower','camp','crystal'])}),1,3),
 suggestions:array(text(100),2,3)
});
export const RULING_SCHEMA=object({kind:choice(['attack','heal','guard','interact','talk']),targetId:text(80),difficulty:choice(['easy','standard','hard']),successText:text(360),failureText:text(240),suggestions:array(text(100),2,3)});
export function matches(schema,value){
 if(schema.type==='object')return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>Object.hasOwn(schema.properties,k))&&schema.required.every(k=>Object.hasOwn(value,k)&&matches(schema.properties[k],value[k]));
 if(schema.type==='array')return Array.isArray(value)&&value.length>=schema.minItems&&value.length<=schema.maxItems&&value.every(v=>matches(schema.items,v));
 if(schema.type==='integer')return Number.isInteger(value)&&value>=schema.minimum&&value<=schema.maximum;
 return typeof value==='string'&&(!schema.minLength||value.length>=schema.minLength)&&(!schema.maxLength||value.length<=schema.maxLength)&&(!schema.enum||schema.enum.includes(value))&&(!schema.pattern||new RegExp(schema.pattern).test(value));
}
