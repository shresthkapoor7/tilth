export const npcDraft = () => ({
  kind: 'npc', notes: 'A possible guide for a future dungeon.',
  npc: {id:'moss-keeper',name:'Moss Keeper',description:'A patient guardian in a green robe.',role:'Healer',weapon:'staff',hp:90,personality:'Patient, curious, and protective of the old spring.',openingLine:'Walk softly; the stone is listening.',disposition:'friendly',appearanceAssetId:'character-healer'}
});
export const mapDraft = (id='moss-hall') => ({
  kind:'map', notes:'An entrance hall draft, not installed in the world.', npcs:[npcDraft().npc],
  map:{id,name:'Moss Hall',description:'A damp hall around an abandoned spring.',theme:'Overgrown volcanic ruins',width:8,height:8,
    tiles:['########','#......#','#......#','#......#','#......#','#......#','#......#','########'],
    entrance:{x:1,y:1},exits:[{id:'east-door',label:'Deeper into the ruins',x:6,y:6}],
    props:[{id:'supply-chest',assetId:'prop-chest',x:4,y:4,blocking:true}],npcs:[{npcId:'moss-keeper',x:3,y:3}]}
});
export const dungeonDraft = () => ({
  kind:'dungeon',notes:'Two connected rooms for review.',
  dungeon:{id:'moss-vault',name:'Moss Vault',description:'A forgotten cistern beneath the caldera.',entryMapId:'moss-hall',
    maps:[mapDraft().map,{...mapDraft('spring-room').map,npcs:[]}],
    connections:[{fromMapId:'moss-hall',fromExitId:'east-door',toMapId:'spring-room',toExitId:'east-door'}]},
  npcs:[npcDraft().npc]
});
