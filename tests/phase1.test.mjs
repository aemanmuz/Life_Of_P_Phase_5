import test from 'node:test';
import assert from 'node:assert/strict';
import {World,TERRAIN,TILE} from '../js/engine/world.js';
import {makePlayer,startRoll,updateMovement,PLAYER_STATS} from '../js/systems/combat.js';
import {WorldClock} from '../js/systems/lifeSim.js';
import {QUEST_STEPS} from '../js/data/quests.js';
import {saveGame,loadGame,hasSave} from '../js/engine/saveSystem.js';

const world=new World();

test('World loads a stable 96 × 72 tilemap',()=>{
  assert.equal(world.tiles.length,72);
  assert.equal(world.tiles[0].length,96);
  assert.equal(world.tiles[52][28],TERRAIN.WATER);
  assert.equal(world.isBlocked(world.spawn.x,world.spawn.y),false);
});

test('A building and lake block movement',()=>{
  assert.equal(world.isBlocked(42*TILE+2,30*TILE+2),true);
  assert.equal(world.isBlocked(28*TILE,52*TILE),true);
});

test('Player walks and spends stamina when rolling',()=>{
  const player=makePlayer(world.spawn);
  const input={direction:()=>({x:1,y:0,moving:true}),down:()=>false};
  const x0=player.x;
  updateMovement(player,world,input,.04);
  assert.ok(player.x>x0);
  assert.equal(startRoll(player,input.direction()),true);
  assert.equal(player.stamina,PLAYER_STATS.maxStamina-PLAYER_STATS.rollStaminaCost);
  assert.equal(player.invulnerable,true);
  assert.equal(startRoll(player,input.direction()),false);
});

test('Quest targets refer to actual interactable landmarks',()=>{
  for(const quest of QUEST_STEPS){
    if(quest.target)assert.ok(world.landmarks.some(p=>p.id===quest.target));
  }
  const stone=world.getNearby(48*TILE,52*TILE);
  assert.equal(stone.id,'stone');
});

test('Clock advances and tracks days',()=>{
  const clock=new WorldClock();
  clock.update(300);
  assert.equal(clock.day,2);
  assert.equal(clock.formatted,'00:20');
  assert.ok(clock.lightLevel>0);
});

test('Save and load round trip stores JSON',()=>{
  const store=new Map();
  globalThis.localStorage={setItem:(key,value)=>store.set(key,value),getItem:key=>store.get(key)||null};
  const game={player:makePlayer(world.spawn),clock:new WorldClock(),questStep:1};
  assert.equal(saveGame(game),true);
  assert.equal(hasSave(),true);
  assert.equal(loadGame().questStep,1);
  assert.equal(loadGame().player.x,world.spawn.x);
});
