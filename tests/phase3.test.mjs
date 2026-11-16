import test from 'node:test';
import assert from 'node:assert/strict';
import {World,TILE} from '../js/engine/world.js';
import {WorldClock} from '../js/systems/lifeSim.js';
import {makeFarm,loadFarm,nearestPlot,workPlot,advanceFarmDay,buySeed,sellHarvest} from '../js/systems/farming.js';
import {getActiveNpcs,nearestNpc} from '../js/data/npcs.js';
import {makeSocial,loadSocial,talkTo,giftTo,marry,startFamily,heirReady,retireToHeir} from '../js/systems/relationships.js';
import {canCraft,RECIPES,craft} from '../js/systems/crafting.js';
import {makePlayer} from '../js/systems/combat.js';
import {makeInventory,addItem,hasItem} from '../js/data/items.js';
import {saveGame,loadGame} from '../js/engine/saveSystem.js';
const world=new World();
function makeGame(){
 const game={world,player:makePlayer(world.spawn),clock:new WorldClock(),farm:makeFarm(),inventory:makeInventory(),social:makeSocial(),homeOwned:false,herbGatherDay:0,questStep:1,enemies:[],drops:[],dropCounter:1,equipment:{weapon:'wanderers-blade',armor:'traveler-cloak'}};
 addItem(game.inventory,'turnip-seed',4);
 return game;
}
test('The calendar progresses across four seven-day seasons and years',()=>{
 const clock=new WorldClock();assert.equal(clock.season,'Spring');
 clock.day=8;assert.equal(clock.season,'Summer');clock.day=15;assert.equal(clock.season,'Autumn');clock.day=22;assert.equal(clock.season,'Winter');
 clock.day=29;assert.equal(clock.season,'Spring');assert.equal(clock.year,2);
 clock.nextMorning();assert.equal(clock.day,30);assert.equal(clock.formatted,'07:00');
});
test('Every Phase 3 activity marker is on walkable land',()=>{
 for(const id of ['farm','cottage','herb-patch','forge']){
  const mark=world.landmarks.find(m=>m.id===id);assert.ok(mark);assert.equal(world.isBlocked(mark.x,mark.y,10),false);
 }
 for(const h of [7,13,19,23]){const c=new WorldClock();c.minutes=h*60;for(const npc of getActiveNpcs(c))assert.equal(world.isBlocked(npc.x,npc.y,10),false,`${npc.id} at ${h}:00`);}
});
test('Farm plots are deterministic and save-loader discards forged coordinates',()=>{
 const farm=makeFarm();assert.equal(farm.length,48);
 const p=farm[0];assert.equal(p.id,'35-41');
 assert.equal(nearestPlot(farm,p.x*TILE+16,p.y*TILE+16)?.id,p.id);
 const modified=loadFarm([{id:'35-41',cropId:'turnip',tilled:true,growth:500,watered:true},{id:'99-99',tilled:true,cropId:'pumpkin'}]);
 assert.equal(modified.length,48);assert.equal(modified[0].growth,2);assert.equal(modified[0].cropId,'turnip');
 assert.equal(modified.at(-1).cropId,null);
});
test('Farmer tills, plants, waters, grows and harvests an Ash Turnip',()=>{
 const game=makeGame(),plot=game.farm[0];game.player.x=plot.x*TILE+16;game.player.y=plot.y*TILE+16;
 assert.equal(workPlot(game,plot.id,'plant','turnip').ok,false);
 assert.equal(workPlot(game,plot.id,'till').ok,true);
 assert.equal(workPlot(game,plot.id,'plant','turnip').ok,true);
 assert.equal(game.inventory.find(row=>row.id==='turnip-seed').quantity,3);
 assert.equal(workPlot(game,plot.id,'water').ok,true);
 assert.equal(workPlot(game,plot.id,'water').ok,false);
 advanceFarmDay(game.farm,'Spring','CLEAR');assert.equal(plot.growth,1);assert.equal(plot.watered,false);
 advanceFarmDay(game.farm,'Spring','RAIN');assert.equal(plot.growth,2);
 assert.equal(workPlot(game,plot.id,'harvest').ok,true);
 assert.equal(plot.cropId,null);assert.equal(game.inventory.find(row=>row.id==='turnip').quantity,2);
});
test('Crops cannot be planted out of season and pause growth out of season',()=>{
 const g=makeGame(),p=g.farm[1];g.player.x=p.x*TILE+16;g.player.y=p.y*TILE+16;
 workPlot(g,p.id,'till');g.clock.day=22;
 assert.equal(workPlot(g,p.id,'plant','turnip').ok,false);
 addItem(g.inventory,'frostroot-seed');assert.equal(workPlot(g,p.id,'plant','frostroot').ok,true);
 workPlot(g,p.id,'water');advanceFarmDay(g.farm,'Spring','CLEAR');assert.equal(p.growth,0);
 assert.equal(p.watered,false);
});
test('Merchant purchases seeds and pays crop sale values',()=>{
 const g=makeGame();g.player.gold=12;
 assert.equal(buySeed(g,'turnip').ok,true);assert.equal(g.player.gold,8);
 assert.equal(buySeed(g,'pumpkin').ok,false);
 addItem(g.inventory,'turnip');assert.equal(sellHarvest(g,'turnip').ok,true);assert.equal(g.player.gold,17);
});
test('Crafting checks all ingredients, removes them, and creates rewards',()=>{
 const g=makeGame(),recipe=RECIPES.find(r=>r.id==='herbal-flask');
 assert.equal(canCraft(g.inventory,recipe),false);
 addItem(g.inventory,'herb',2);addItem(g.inventory,'ash-fragment',1);
 assert.equal(craft(g,'herbal-flask').ok,true);assert.equal(hasItem(g.inventory,'ash-fragment'),false);
 assert.equal(g.inventory.find(row=>row.id==='ember-flask').quantity,3);
});
test('Conversations and gifts work once daily; romance requires cottage and friendship',()=>{
 const g=makeGame();assert.equal(talkTo(g,'mira').ok,true);assert.equal(talkTo(g,'mira').ok,false);
 addItem(g.inventory,'turnip',3);assert.equal(giftTo(g,'mira','turnip').ok,true);assert.equal(giftTo(g,'mira','turnip').ok,false);
 assert.equal(g.social.affinity.mira,32);assert.equal(marry(g,'mira').ok,false);
 for(const day of [2,3,4]){g.clock.day=day;talkTo(g,'mira');giftTo(g,'mira','turnip');}
 assert.equal(g.social.affinity.mira,100);assert.equal(marry(g,'mira').ok,false);
 g.homeOwned=true;assert.equal(marry(g,'mira').ok,true);assert.equal(g.social.marriedTo,'mira');
});
test('Family heir grows over seven days then inherits social generation',()=>{
 const g=makeGame();g.homeOwned=true;g.social.affinity.rowan=80;
 assert.equal(marry(g,'rowan').ok,true);assert.equal(startFamily(g,'Ari').ok,false);
 g.clock.day=3;assert.equal(startFamily(g,'Ari').ok,true);assert.equal(heirReady(g.social,9),false);
 assert.equal(retireToHeir(g).ok,false);g.clock.day=10;
 assert.equal(heirReady(g.social,10),true);assert.equal(retireToHeir(g).ok,true);
 assert.equal(g.social.activeName,'Ari');assert.equal(g.social.generation,2);
 assert.equal(g.social.marriedTo,null);assert.equal(g.social.ancestors.length,1);
});
test('Version 3 saves and restores life-state and still recognizes valid version 2 files',()=>{
 const store=new Map();globalThis.localStorage={setItem:(key,value)=>store.set(key,value),getItem:key=>store.get(key)||null};
 const game=makeGame();game.homeOwned=true;game.social.affinity.mira=80;game.farm[0].tilled=true;
 assert.equal(saveGame(game),true);
 const loaded=loadGame();assert.equal(loaded.version,5);assert.equal(loaded.homeOwned,true);
 assert.equal(loadSocial(loaded.social).affinity.mira,80);assert.equal(loadFarm(loaded.farm)[0].tilled,true);
 const v2={version:2,player:{x:world.spawn.x,y:world.spawn.y},clock:500,day:1,questStep:0};
 store.set('life-of-p-phase1-v1',JSON.stringify(v2));assert.equal(loadGame().version,2);
});
