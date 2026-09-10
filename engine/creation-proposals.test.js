import test from 'node:test';
import assert from 'node:assert/strict';
import * as proposals from './creation-proposals.js';
import {npcDraft,mapDraft,dungeonDraft} from '../test-support/creation-fixtures.js';

test('valid creation drafts are returned detached and explicitly never applied',()=>{
  assert.equal(typeof proposals.validateProposal,'function');
  for(const draft of [npcDraft(),mapDraft(),dungeonDraft()]){
    const result=proposals.validateProposal(draft);
    assert.equal(result.ok,true,JSON.stringify(result.errors));
    assert.deepEqual(result.proposal,draft);
    assert.notEqual(result.proposal,draft);
  }
});
test('unknown fields, executable extras and unsupported NPC appearances are rejected',()=>{
  assert.equal(typeof proposals.validateProposal,'function');
  for(const change of [{code:'alert(1)'},{hp:Infinity},{appearanceAssetId:'https://example.com/a.png'},{weapon:'laser'}]){
    const draft=npcDraft();Object.assign(draft.npc,change);
    const result=proposals.validateProposal(draft);
    assert.equal(result.ok,false);assert.ok(result.errors[0].path.startsWith('$.npc'));
  }
});
test('map dimensions, boundary walls, duplicate props and missing references are rejected',()=>{
  assert.equal(typeof proposals.validateProposal,'function');
  const edits=[d=>d.map.tiles.pop(),d=>d.map.tiles[0]='........',d=>d.map.props.push({...d.map.props[0]}),d=>d.map.props[0].assetId='missing',d=>d.map.npcs[0].npcId='unknown',d=>d.map.entrance.x=30];
  for(const edit of edits){const d=mapDraft();edit(d);assert.equal(proposals.validateProposal(d).ok,false);}
});
test('water and solid props cannot seal off entrances, exits or NPC access',()=>{
  assert.equal(typeof proposals.validateProposal,'function');
  for(const tile of ['#','~']){const d=mapDraft();d.map.tiles[2]=`#${tile.repeat(6)}#`;assert.equal(proposals.validateProposal(d).ok,false);}
  const d=mapDraft();d.map.props=[{id:'first',assetId:'prop-chest',x:2,y:1,blocking:true},{id:'second',assetId:'prop-chest',x:1,y:2,blocking:true}];
  const result=proposals.validateProposal(d);assert.equal(result.ok,false);assert.ok(result.errors.some(e=>e.code==='unreachable'));
});
test('dungeon connections require known unique endpoints and a connected map graph',()=>{
  assert.equal(typeof proposals.validateProposal,'function');
  for(const edit of [d=>d.dungeon.connections[0].toMapId='missing',d=>d.dungeon.connections[0].toExitId='missing',d=>d.dungeon.connections=[],d=>d.dungeon.maps.push({...mapDraft('isolated').map,npcs:[]}),d=>d.dungeon.connections.push({...d.dungeon.connections[0]})]){
    const d=dungeonDraft();edit(d);assert.equal(proposals.validateProposal(d).ok,false);
  }
});
test('drafts cannot overwrite authored map or NPC identities and NPC placements are unique',()=>{
  assert.equal(typeof proposals.validateProposal,'function');
  const d=mapDraft('inn');assert.equal(proposals.validateProposal(d).ok,false);
  const n=npcDraft();n.npc.id='rowan';assert.equal(proposals.validateProposal(n).ok,false);
  const dungeon=dungeonDraft();dungeon.dungeon.maps[1].npcs=[...dungeon.dungeon.maps[0].npcs];assert.equal(proposals.validateProposal(dungeon).ok,false);
});
