import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../js/engine/world.js';
import {makePlayer} from '../js/systems/combat.js';
import {makeEnemies} from '../js/systems/enemyAI.js';
import {makeInventory} from '../js/data/items.js';
import {WorldClock} from '../js/systems/lifeSim.js';
import {makeSocial} from '../js/systems/relationships.js';
import {makeNemesis,loadNemesis,syncNemesis,onCaptainKilled,onCaptainVictory,advanceNemesisDay,canDominate,dominateCaptain,updateRecruits} from '../js/systems/nemesis.js';
import {makeDialogue,loadDialogue,resolveDialogue,skillCheck,skillBonus,awardSkill,SCENES} from '../js/systems/dialogue.js';
import {saveGame,loadGame} from '../js/engine/saveSystem.js';
function fixture(){const world=new World(),player=makePlayer(world.spawn);
 const g={world,player,clock:new WorldClock(),enemies:makeEnemies(world),nemesis:makeNemesis(),dialogue:makeDialogue(),social:makeSocial(),inventory:makeInventory(),equipment:{weapon:'wanderers-blade',armor:'traveler-cloak'},questStep:0,drops:[],dropCounter:1,effect(){},onEnemyKilled(enemy){onCaptainKilled(this,enemy);},toast(){}};
 syncNemesis(g);return g;
}
test('Four unique named captains inhabit the world, with upgraded combat stats and weaknesses',()=>{
 const g=fixture();assert.equal(g.nemesis.captains.length,4);
 assert.equal(new Set(g.nemesis.captains.map(c=>c.name)).size,4);
 for(const c of g.nemesis.captains){const e=g.enemies.find(e=>e.id===c.id);assert.equal(e.captain,true);assert.ok(e.health>48);assert.equal(e.health,e.maxHealth);assert.ok(['parry','heavy','light','stagger'].includes(c.weakness));}
});
test('The captain that defeats the player is promoted, remembers the victory and gets stronger',()=>{
 const g=fixture(),e=g.enemies.find(e=>e.id==='foe-0'),startDamage=e.damage;
 const result=onCaptainVictory(g,e);assert.equal(result.rank,2);assert.equal(result.victories,1);
 assert.ok(e.damage>startDamage);assert.ok(g.nemesis.events[0].includes('rank 2'));
 assert.equal(loadNemesis(g.nemesis).captains[0].rank,2);
 assert.equal(loadNemesis(g.nemesis).captains[0].name,g.nemesis.captains[0].name);
});
test('Captains fall, return scarred after days, and remain defeated on the third kill',()=>{
 const g=fixture(),e=g.enemies.find(e=>e.id==='foe-0'),c=g.nemesis.captains[0];
 for(let count=0;count<3;count++){
  e.alive=false;onCaptainKilled(g,e);
  assert.equal(c.defeats,count+1);
  if(count<2){assert.equal(c.status,'fallen');g.clock.day=c.returnDay;
   assert.equal(advanceNemesisDay(g),1);assert.equal(c.status,'active');assert.equal(e.alive,true);
  } else {assert.equal(c.status,'vanquished');g.clock.day+=100;assert.equal(advanceNemesisDay(g),0);assert.equal(e.alive,false);}
 }
});
test('Domination requires a weakened nearby captain; success recruits a companion who attacks rivals',()=>{
 const g=fixture(),c=g.nemesis.captains[0],e=g.enemies.find(e=>e.id===c.id);
 assert.equal(canDominate(g,e),false);g.player.x=e.x+25;g.player.y=e.y;e.health=e.maxHealth*.25;
 assert.equal(canDominate(g,e),true);
 const result=dominateCaptain(g,c.id,()=>({success:true,die:20,bonus:0,total:20}));
 assert.equal(result.success,true);assert.equal(c.status,'recruited');assert.equal(e.recruited,true);
 const foe=g.enemies.find(x=>x.id!==e.id&&!x.captain&&!x.elite);foe.x=e.x+25;foe.y=e.y;foe.health=50;
 updateRecruits(g,1.5);assert.ok(foe.health<50);assert.equal(canDominate(g,e),false);
});
test('A failed domination check does not recruit and restores captain resolve',()=>{
 const g=fixture(),e=g.enemies.find(e=>e.id==='foe-0');g.player.x=e.x;g.player.y=e.y;e.health=e.maxHealth*.2;
 const r=dominateCaptain(g,e.id,()=>({success:false,total:3,die:3,bonus:0}));
 assert.equal(r.success,false);assert.ok(e.health>=e.maxHealth*.42);assert.equal(g.nemesis.captains[0].status,'active');
});
test('All five skills exist; XP and equipment affect the d20 bonus; natural 1 and 20 are critical',()=>{
 const g=fixture();assert.deepEqual(Object.keys(g.dialogue.skills).sort(),['arcana','intimidation','persuasion','sleight','survival'].sort());
 assert.equal(skillBonus(g,'survival'),1);awardSkill(g,'survival',8);assert.equal(skillBonus(g,'survival'),3);
 assert.equal(skillCheck(g,'survival',99,()=>.9999).success,true);
 assert.equal(skillCheck(g,'survival',1,()=>0).success,false);
});
test('Dialogue offers branching choices, saves one permanent scene outcome, gives rewards on success',()=>{
 const g=fixture();assert.ok(SCENES.vell.choices.length>=3);
 const before=g.player.gold;const win=resolveDialogue(g,'vell','appeal',()=>.999);
 assert.equal(win.ok,true);assert.equal(win.success,true);assert.equal(g.player.gold,before+35);
 assert.equal(resolveDialogue(g,'vell','threaten',()=>.999).ok,false);
 const failure=resolveDialogue(g,'ruins','pick',()=>0);assert.equal(failure.ok,true);assert.equal(failure.success,false);
 assert.equal(loadDialogue(g.dialogue).flags.ruins,'pick');
});
test('Phase 4 saves captains, branching flags, XP and still accepts old versions',()=>{
 const storage=new Map();globalThis.localStorage={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null};
 const g=fixture();g.nemesis.captains[0].rank=4;g.dialogue.skills.arcana=12;g.dialogue.flags.stone='interpret';
 assert.equal(saveGame(g),true);let saved=loadGame();assert.equal(saved.version,5);
 assert.equal(loadNemesis(saved.nemesis).captains[0].rank,4);assert.equal(loadDialogue(saved.dialogue).skills.arcana,12);assert.equal(saved.dialogue.flags.stone,'interpret');
 for(const version of [1,2,3]){storage.set('life-of-p-phase1-v1',JSON.stringify({version,player:{x:g.player.x,y:g.player.y},clock:400,questStep:1}));assert.equal(loadGame()?.version,version);}
});
