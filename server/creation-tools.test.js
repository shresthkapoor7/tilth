import test from 'node:test';
import assert from 'node:assert/strict';
import * as tools from './creation-tools.js';
import {mapDraft,dungeonDraft,npcDraft} from '../test-support/creation-fixtures.js';

test('tools query actual authored content without requiring model credentials',()=>{
  assert.equal(typeof tools.executeCreationTool,'function');
  assert.equal(tools.executeCreationTool('get_npc',{npcId:'rowan'}).ok,true);
  assert.equal(tools.executeCreationTool('get_map',{mapId:'inn'}).ok,true);
  assert.equal(tools.executeCreationTool('get_creation_capabilities',{}).data.output,'reviewable drafts only; no live world mutation');
});
test('proposal tools validate the requested kind and return a detached unapplied draft',()=>{
  assert.equal(typeof tools.executeCreationTool,'function');
  for(const draft of [mapDraft(),dungeonDraft(),npcDraft()]){
    const result=tools.executeCreationTool(`propose_${draft.kind}`,draft);
    assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.applied,false);assert.equal(result.status,'draft');assert.deepEqual(result.proposal,draft);
  }
  assert.equal(tools.executeCreationTool('propose_map',npcDraft()).ok,false);
});
test('unknown tools and malformed arguments return repairable errors',()=>{
  assert.equal(typeof tools.executeCreationTool,'function');
  for(const [name,args] of [['eval',{code:'danger'}],['__proto__',{}],['get_npc',{npcId:'missing'}],['get_map',{mapId:'inn',override:true}],['get_world_overview',null]]){
    const result=tools.executeCreationTool(name,args);assert.equal(result.ok,false);assert.ok(result.errors[0].message);
  }
});
test('every exposed function has a strict schema and registry callers cannot mutate it',()=>{
  assert.equal(typeof tools.getCreationTools,'function');
  const first=tools.getCreationTools();assert.ok(first.length>=8);
  for(const t of first){assert.equal(t.type,'function');assert.equal(t.strict,true);assert.equal(t.parameters.additionalProperties,false);}
  first[0].name='corrupted';assert.equal(tools.getCreationTools().some(t=>t.name==='corrupted'),false);
});
