import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {validateProposal} from '../engine/creation-proposals.js';
const run=(args=[],env=process.env)=>spawnSync(process.execPath,['scripts/smoke-creation.mjs',...args],{encoding:'utf8',env,timeout:15000});
test('offline smoke exercises HTTP query, invalid draft repair and final NPC output',()=>{
  const result=run(['--kind','npc']);assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/^\{/);const report=JSON.parse(result.stdout);assert.equal(report.mode,'fixture');assert.equal(report.upstreamCalls,3);
  assert.equal(report.result.applied,false);assert.equal(validateProposal(report.result.proposal).ok,true);
});
test('smoke rejects invalid flags and never silently replaces missing live credentials with fixtures',()=>{
  assert.notEqual(run(['--kind','unknown']).status,0);
  const env={...process.env};delete env.OPENAI_API_KEY;delete env.OPENAI_MODEL;
  const result=run(['--live'],env);assert.notEqual(result.status,0);assert.match(result.stderr,/OPENAI_API_KEY/);assert.equal(result.stdout,'');
});
