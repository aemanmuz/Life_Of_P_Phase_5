import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../js/engine/world.js';
import {makeEnemies,updateEnemies} from '../js/systems/enemyAI.js';
import {makePlayer,startAttack,startParry,startRoll,isParryActive,updatePlayerCombat,applyPlayerDamage,ATTACKS} from '../js/systems/combat.js';
import {makeInventory,addItem,removeItem,hasItem,ITEMS,sanitizedInventory} from '../js/data/items.js';
import {generateLoot,nearbyDrop,collectDrop,equipItem,useItem} from '../js/systems/loot.js';
import {saveGame,loadGame} from '../js/engine/saveSystem.js';
import {WorldClock} from '../js/systems/lifeSim.js';

const world=new World();
function makeGame(){
  const p=makePlayer(world.spawn);
  const game={world,clock:new WorldClock(),player:p,equipment:{weapon:'wanderers-blade',armor:'traveler-cloak'},inventory:makeInventory(),enemies:makeEnemies(world),drops:[],dropCounter:1,questStep:0,events:[],effect(x,y,message){this.events.push(message);},toast(message){this.events.push(message);},onEnemyKilled(enemy){this.player.kills++;generateLoot(this,enemy);},onPlayerDefeated(){this.player.dead=true;}};
  return game;
}
test('All Phase 2 enemy spawn points are walkable and the boss is in the ruins',()=>{
  const enemies=makeEnemies(world);
  assert.equal(enemies.length,13);
  for(const e of enemies)assert.equal(world.isBlocked(e.x,e.y,e.radius),false,e.name);
  assert.equal(enemies.filter(e=>e.elite).length,4);
  assert.ok(enemies.find(e=>e.kind==='ash-warden').x>70*32);
});
test('Light/heavy attack rules spend stamina and prevent overlapping attacks',()=>{
  const game=makeGame();const p=game.player;
  assert.equal(startAttack(p,'light'),true);
  assert.equal(p.stamina,85);
  assert.equal(startAttack(p,'heavy'),false);
  updatePlayerCombat(game,ATTACKS.light.duration+.01);
  assert.equal(p.attack,null);
  assert.equal(startAttack(p,'heavy'),false); // recovery cooldown
  updatePlayerCombat(game,.2);
  assert.equal(startAttack(p,'heavy'),true);
  assert.equal(p.stamina,51);
});
test('Directional attacks damage enemies in front, not behind',()=>{
  const game=makeGame(),p=game.player;
  const a=game.enemies[0],b=game.enemies[1];
  p.facingX=1;p.facingY=0;
  a.x=p.x+45;a.y=p.y;a.health=a.maxHealth;
  b.x=p.x-45;b.y=p.y;b.health=b.maxHealth;
  assert.equal(startAttack(p,'light'),true);
  updatePlayerCombat(game,.15);
  assert.equal(a.health,a.maxHealth-ITEMS['wanderers-blade'].damage);
  assert.equal(b.health,b.maxHealth);
  const hp=a.health;
  updatePlayerCombat(game,.03);
  assert.equal(a.health,hp,'single attack must not apply damage twice');
});
test('Heavy attack breaks posture and stuns a nearby enemy',()=>{
  const game=makeGame(),p=game.player,e=game.enemies[0];
  p.facingX=0;p.facingY=1;e.x=p.x;e.y=p.y+47;
  assert.equal(startAttack(p,'heavy'),true);
  updatePlayerCombat(game,.36);
  assert.ok(e.health<e.maxHealth);
  assert.equal(e.state,'stagger');
});
test('Timed parry stops a strike, stuns attacker, and has a cooldown',()=>{
  const game=makeGame(),p=game.player,e=game.enemies[0];
  assert.equal(startParry(p),true);
  assert.equal(isParryActive(p),true);
  const hp=p.health;
  assert.deepEqual(applyPlayerDamage(game,18,e),{parried:true});
  assert.equal(p.health,hp);
  assert.equal(e.state,'stagger');
  assert.equal(startParry(p),false);
});
test('Armor reduces enemy hits and dodge i-frames block hits',()=>{
  const game=makeGame(),p=game.player,e=game.enemies[0];
  assert.equal(applyPlayerDamage(game,20,e).damage,19);
  assert.equal(p.health,81);
  assert.deepEqual(applyPlayerDamage(game,20,e),{blocked:true});
  p.invulnerable=false;p.invulnTimer=0;
  assert.equal(startRoll(p,{x:1,y:0,moving:true}),true);
  assert.deepEqual(applyPlayerDamage(game,20,e),{blocked:true});
});
test('Enemies chase and wind up attacks without striking instantly',()=>{
  const game=makeGame(),p=game.player,e=game.enemies[0];
  p.x=e.x+e.reach-1;p.y=e.y;
  e.state='idle';e.attackWait=0;
  const hp=p.health;
  updateEnemies(game,.016);
  assert.equal(e.state,'windup');
  assert.equal(p.health,hp);
  updateEnemies(game,e.windup+.02);
  assert.equal(e.state,'recover');
  assert.ok(p.health<hp);
});
test('Drops are collectible; equipped gear modifies stats; flasks restore health',()=>{
  const game=makeGame();
  addItem(game.inventory,'waykeeper-edge');
  assert.equal(equipItem(game,'waykeeper-edge'),true);
  assert.equal(game.equipment.weapon,'waykeeper-edge');
  game.player.health=55;
  assert.equal(useItem(game,'ember-flask'),true);
  assert.equal(game.player.health,95);
  assert.equal(game.inventory.find(r=>r.id==='ember-flask').quantity,1);
  game.drops=[{uid:'loot-1',itemId:'sunken-plate',x:game.player.x+4,y:game.player.y}];
  assert.equal(nearbyDrop(game).itemId,'sunken-plate');
  collectDrop(game,nearbyDrop(game));
  assert.equal(hasItem(game.inventory,'sunken-plate'),true);
  assert.equal(game.drops.length,0);
});
test('An elite drop is Legendary; ordinary enemies never drop Legendary items',()=>{
  const game=makeGame();
  const elite=game.enemies.find(e=>e.elite);
  assert.equal(generateLoot(game,elite).item.rarity,'Legendary');
  assert.equal(game.drops.at(-1).itemId,'crownless-edge');
  for(let i=0;i<150;i++)assert.notEqual(generateLoot(game,game.enemies[0]).item.rarity,'Legendary');
});
test('Sanitizing inventory discards forged items and invalid quantities',()=>{
  const inventory=sanitizedInventory([{id:'fake',quantity:1},{id:'ember-flask',quantity:3},{id:'ember-flask',quantity:2},{id:'waykeeper-edge',quantity:-4}]);
  assert.deepEqual(inventory,[{id:'ember-flask',quantity:5}]);
  assert.equal(removeItem(inventory,'ember-flask',5),true);
  assert.equal(inventory.length,0);
});
test('Newest save persists Phase 2 loot and equipment; version 1 remains loadable',()=>{
  const store=new Map();globalThis.localStorage={setItem:(key,value)=>store.set(key,value),getItem:key=>store.get(key)||null};
  const game=makeGame();addItem(game.inventory,'waykeeper-edge');game.equipment.weapon='waykeeper-edge';
  game.enemies[0].alive=false;game.enemies[0].health=0;
  game.drops.push({uid:'loot-1',itemId:'ember-flask',x:1500,y:1500});
  assert.equal(saveGame(game),true);
  const saved=loadGame();assert.equal(saved.version,5);
  assert.equal(saved.equipment.weapon,'waykeeper-edge');
  assert.equal(saved.enemies[0].alive,false);
  assert.equal(saved.drops[0].itemId,'ember-flask');
  store.set('life-of-p-phase1-v1',JSON.stringify({version:1,player:{x:world.spawn.x,y:world.spawn.y},clock:500,questStep:1}));
  assert.equal(loadGame().version,1);
});
