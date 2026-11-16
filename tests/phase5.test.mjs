import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../js/engine/world.js';
import {makeEnemies,updateEnemies} from '../js/systems/enemyAI.js';
import {makePlayer,playerAttackPower,playerDefense} from '../js/systems/combat.js';
import {makeInventory,ITEMS,hasItem} from '../js/data/items.js';
import {WorldClock} from '../js/systems/lifeSim.js';
import {makeSocial} from '../js/systems/relationships.js';
import {makeStory,loadStory,chooseAlignment,onStoryBossKilled,finishStory,endingEligibility,storyObjective} from '../js/systems/story.js';
import {ALIGNMENTS,SIGILS} from '../js/data/story.js';
import {eventForDay,EVENTS} from '../js/systems/worldEvents.js';
import {generateLoot} from '../js/systems/loot.js';
import {saveGame,loadGame,importSave,exportSave} from '../js/engine/saveSystem.js';
import {GameAudio} from '../js/systems/audio.js';
const world=new World();
function fixture(){const p=makePlayer(world.spawn);return {world,clock:new WorldClock(),player:p,inventory:makeInventory(),equipment:{weapon:'wanderers-blade',armor:'traveler-cloak'},enemies:makeEnemies(world),farm:[],drops:[],dropCounter:1,social:makeSocial(),questStep:2,story:makeStory(),effect(){},toast(){}};}
test('All story landmarks and four elite bosses are walkable and accessible',()=>{
 const g=fixture(),bosses=g.enemies.filter(e=>e.elite);
 assert.deepEqual(bosses.map(e=>e.name),['Ashen Warden','Thorn Matriarch','Drowned Herald','Cinder Regent']);
 for(const b of bosses)assert.equal(world.isBlocked(b.x,b.y,b.radius),false,b.name);
 for(const id of ['convergence-altar','elderbough','silvermere-ward','cinder-gate']){
  const landmark=world.landmarks.find(e=>e.id===id);assert.ok(landmark);assert.equal(world.isBlocked(landmark.x,landmark.y,12),false,id);
 }
});
test('Destiny requires the introductory journey and choices cannot be overwritten',()=>{
 const g=fixture();g.questStep=0;assert.equal(chooseAlignment(g,'hero').ok,false);
 g.questStep=2;assert.equal(chooseAlignment(g,'hero').ok,true);
 assert.equal(chooseAlignment(g,'villain').ok,false);assert.equal(g.story.alignment,'hero');
 assert.equal(chooseAlignment(g,'foo').ok,false);
});
test('Three unique sigils are recovered from the correct bosses only once',()=>{
 const g=fixture();assert.equal(onStoryBossKilled(g,g.enemies.find(e=>e.kind==='ash-warden')),null);
 for(const s of SIGILS){const e=g.enemies.find(e=>e.kind===s.boss);assert.equal(onStoryBossKilled(g,e)?.id,s.id);assert.equal(onStoryBossKilled(g,e),null);}
 assert.deepEqual(g.story.sigils,['grove','mere','cinder']);
 assert.equal(g.story.events.length,3);
});
test('Paragon story objective advances through all boss sigils and unlocks a single ending',()=>{
 const g=fixture();assert.equal(chooseAlignment(g,'hero').ok,true);assert.equal(storyObjective(g).target,'elderbough');
 for(const s of SIGILS){assert.equal(storyObjective(g).target,({grove:'elderbough',mere:'silvermere-ward',cinder:'cinder-gate'})[s.id]);onStoryBossKilled(g,g.enemies.find(e=>e.kind===s.boss));}
 assert.equal(storyObjective(g).target,'convergence-altar');assert.equal(endingEligibility(g).ready,true);
 const coins=g.player.gold;assert.equal(finishStory(g).ok,true);assert.equal(g.story.ending,'hero');assert.equal(g.player.gold,coins+500);
 assert.equal(finishStory(g).ok,false);assert.equal(g.player.gold,coins+500);assert.ok(hasItem(g.inventory,'dawnward-armor'));assert.equal(storyObjective(g).name,'The Story Continues');
});
test('Usurper route has its own ending after the three boss victories',()=>{
 const g=fixture();chooseAlignment(g,'villain');for(const s of SIGILS)onStoryBossKilled(g,g.enemies.find(e=>e.kind===s.boss));
 assert.equal(finishStory(g).ending.endingTitle,ALIGNMENTS.villain.endingTitle);assert.equal(g.story.ending,'villain');assert.ok(hasItem(g.inventory,'eclipse-sabre'));
});
test('Civilian route can finish without any boss fights after cottage and heir progression',()=>{
 const g=fixture();chooseAlignment(g,'civilian');assert.equal(endingEligibility(g).ready,false);
 g.homeOwned=true;assert.equal(endingEligibility(g).ready,false);g.social.generation=2;
 assert.equal(endingEligibility(g).ready,true);assert.equal(finishStory(g).ok,true);
 assert.equal(g.story.sigils.length,0);assert.equal(g.story.ending,'civilian');assert.ok(hasItem(g.inventory,'hearthloom-coat'));
});
test('Loading story state ignores unexpected sigils, endings and invalid chronicle entries',()=>{
 const clean=loadStory({alignment:'hero',sigils:['grove','cinder','fake','grove'],ending:'villain',events:['ok',123,{bad:true}]});
 assert.equal(clean.ending,null);assert.deepEqual(clean.sigils,['grove','cinder']);assert.deepEqual(clean.events,['ok']);
 assert.equal(loadStory({alignment:'evil',ending:'evil'}).alignment,null);
});
test('World events cycle deterministically with meaningful damage and stamina modifiers',()=>{
 assert.deepEqual(EVENTS.map(e=>e.id),['calm','ashfall','eclipse','bloom']);
 for(let day=1;day<=16;day++)assert.equal(eventForDay(day).id,eventForDay(day+8).id);
 assert.ok(EVENTS.find(e=>e.id==='eclipse').enemyDamage>1);
 assert.ok(EVENTS.find(e=>e.id==='ashfall').staminaRegen<1);
 assert.ok(EVENTS.find(e=>e.id==='bloom').staminaRegen>1);
});
test('Each new legendary boss drops its own exclusive item',()=>{
 const g=fixture();for(const [kind,itemId] of [['thorn-matriarch','verdant-oath'],['drowned-herald','tidebound-mail'],['cinder-regent','cinderbrand']]){
  const result=generateLoot(g,g.enemies.find(e=>e.kind===kind));assert.equal(result.item.id,itemId);assert.equal(ITEMS[itemId].rarity,'Legendary');
 }
 assert.equal(g.drops.length,3);
});
test('Phase 5 saves story and imports older saves; corrupt JSON is rejected',()=>{
 const storage=new Map();globalThis.localStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null};
 const g=fixture();chooseAlignment(g,'villain');onStoryBossKilled(g,g.enemies.find(e=>e.kind==='thorn-matriarch'));
 assert.equal(saveGame(g),true);const saved=loadGame();assert.equal(saved.version,5);
 assert.equal(loadStory(saved.story).alignment,'villain');assert.deepEqual(saved.story.sigils,['grove']);
 const backup=exportSave();assert.ok(backup.includes('"version":5'));assert.equal(importSave('not JSON').ok,false);
 const old={version:4,player:{x:1000,y:1200},questStep:1,clock:360};
 assert.equal(importSave(JSON.stringify(old)).ok,true);assert.equal(loadGame().version,4);
 assert.equal(importSave(backup).ok,true);assert.equal(loadGame().version,5);
});
test('Audio starts muted and gracefully handles a browser without Web Audio support',()=>{
 const a=new GameAudio();assert.equal(a.enabled,false);assert.equal(a.toggle(),false);assert.equal(a.enabled,false);
});

test('Alignment perks change combat attributes and bosses enrage below their threshold',()=>{
 const g=fixture();assert.equal(playerAttackPower(g),9);chooseAlignment(g,'villain');assert.equal(playerAttackPower(g),14);
 const guardian=fixture();chooseAlignment(guardian,'hero');assert.equal(playerDefense(guardian),5);
 const elite=guardian.enemies.find(e=>e.kind==='thorn-matriarch');elite.health=elite.maxHealth*.45;const before=elite.damage;
 elite.x=guardian.player.x+90;elite.y=guardian.player.y;guardian.effect=()=>{};
 assert.doesNotThrow(()=>updateEnemies(guardian,.05));assert.equal(elite.enraged,true);assert.ok(elite.damage>before);
});
