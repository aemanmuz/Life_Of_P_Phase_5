import {World} from './engine/world.js';
import {Input} from './engine/input.js';
import {CanvasEngine} from './engine/canvas.js';
import {WorldClock} from './systems/lifeSim.js';
import {makeFarm,loadFarm,nearestPlot,workPlot,advanceFarmDay,buySeed,sellHarvest} from './systems/farming.js';
import {getActiveNpcs,nearestNpc,NPCS} from './data/npcs.js';
import {makeSocial,loadSocial,talkTo,giftTo,marry,startFamily,retireToHeir} from './systems/relationships.js';
import {craft} from './systems/crafting.js';
import {makePlayer,startRoll,startAttack,startParry,updateMovement,updatePlayerCombat,PLAYER_STATS} from './systems/combat.js';
import {makeEnemies,updateEnemies} from './systems/enemyAI.js';
import {generateLoot,nearbyDrop,collectDrop,equipItem,useItem} from './systems/loot.js';
import {ITEMS,makeInventory,sanitizedInventory,hasItem,addItem} from './data/items.js';
import {saveGame,loadGame,hasSave} from './engine/saveSystem.js';
import {QUEST_STEPS} from './data/quests.js';
import {updateHUD} from './ui/hudUI.js';
import {inventoryMarkup} from './ui/inventoryUI.js';
import {nemesisMarkup,dominationMarkup,dialogueMarkup,dialogueGuideMarkup} from './ui/nemesisUI.js';
import {makeNemesis,loadNemesis,syncNemesis,onCaptainKilled,onCaptainVictory,advanceNemesisDay,nearestDomination,dominateCaptain,updateRecruits} from './systems/nemesis.js';
import {SCENES,makeDialogue,loadDialogue,resolveDialogue,skillCheck,awardSkill} from './systems/dialogue.js';
import {farmMarkup,merchantMarkup,npcMarkup,cottageMarkup,craftingMarkup,lifeMarkup,relationshipOverview,farmGuideMarkup} from './ui/lifeUI.js';
import {makeStory,loadStory,chooseAlignment,onStoryBossKilled,endingEligibility,finishStory,storyObjective} from './systems/story.js';
import {eventForDay} from './systems/worldEvents.js';
import {GameAudio} from './systems/audio.js';
import {storyMarkup,altarMarkup,epilogueMarkup} from './ui/storyUI.js';
import {STORY_SCENES} from './data/story.js';
import {exportSave,importSave} from './engine/saveSystem.js';

const $=id=>document.getElementById(id);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
class Game {
  constructor(){
    this.world=new World();this.clock=new WorldClock();this.player=makePlayer(this.world.spawn);
    this.enemies=makeEnemies(this.world);this.inventory=makeInventory();
    this.farm=makeFarm();this.social=makeSocial();this.homeOwned=false;this.herbGatherDay=0;
    this.nemesis=makeNemesis();this.dialogue=makeDialogue();this.story=makeStory();this.worldEvent=eventForDay(this.clock.day);this.audio=new GameAudio();syncNemesis(this);
    this.npcs=getActiveNpcs(this.clock);
    this.equipment={weapon:'wanderers-blade',armor:'traveler-cloak'};
    this.drops=[];this.dropCounter=1;this.fx=[];
    this.input=new Input();this.renderer=new CanvasEngine($('game-canvas'),this.world);
    this.started=false;this.paused=false;this.modalOpen=false;this.questStep=0;
    this.saveTimer=0;this.toastTimer=0;this.lastTime=0;
    this.bindUI();this.refreshContinueButton();
    window.__lifeOfPReady=true;window.__lifeOfPGame=this;requestAnimationFrame(time=>this.loop(time));
  }
  bindUI(){
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-action]');
      if(button)this.action(button.dataset.action);
      else if(event.target===$('modal-backdrop'))this.closeModal();
    });
    $('game-canvas').addEventListener('pointerdown',event=>{
      if(!this.started||this.paused||this.modalOpen||this.player.dead)return;
      if(event.button===0){if(startAttack(this.player,'light'))this.audio.sound('light');}
      else if(event.button===2){if(startAttack(this.player,'heavy'))this.audio.sound('heavy');}
    });
    $('game-canvas').addEventListener('contextmenu',event=>event.preventDefault());
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.started&&!this.paused&&!this.player.dead)this.pause();});
    document.querySelectorAll('.mobile-controls').forEach(el=>el.addEventListener('contextmenu',e=>e.preventDefault()));
    const importInput=$('save-import-file');
    if(importInput)importInput.addEventListener('change',async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      if(file.size>500000)return this.toast('Save file is too large (500 KB limit).');
      try{const content=await file.text();const outcome=importSave(content);
        this.toast(outcome.ok?'Save imported! Choose Continue Journey to load it.':outcome.message);this.refreshContinueButton();
      }catch{this.toast('Cannot read that save file.');}
    });
  }
  refreshContinueButton(){$('continue-button').classList.toggle('hidden',!hasSave());}
  freshState(){
    this.player=makePlayer(this.world.spawn);this.clock=new WorldClock();this.questStep=0;
    this.inventory=makeInventory();this.equipment={weapon:'wanderers-blade',armor:'traveler-cloak'};
    this.enemies=makeEnemies(this.world);this.drops=[];this.dropCounter=1;this.fx=[];this.saveTimer=0;
    this.farm=makeFarm();this.social=makeSocial();this.homeOwned=false;this.herbGatherDay=0;
    this.nemesis=makeNemesis();this.dialogue=makeDialogue();this.story=makeStory();this.worldEvent=eventForDay(this.clock.day);syncNemesis(this);
    this.npcs=getActiveNpcs(this.clock);addItem(this.inventory,'turnip-seed',4);
  }
  newGame(){this.freshState();this.start();this.toast('Phase 5 is live! Complete the first waystone quest, then press O for the Convergence Chronicle.');}
  continueGame(){
    const save=loadGame();if(!save){this.toast('No valid save was found.');return;}
    this.freshState();
    if(save.version>=4){this.nemesis=loadNemesis(save.nemesis);this.dialogue=loadDialogue(save.dialogue);syncNemesis(this);}
    if(save.version>=5)this.story=loadStory(save.story);
    if(!this.world.isBlocked(save.player.x,save.player.y)){this.player.x=save.player.x;this.player.y=save.player.y;}
    for(const key of ['health','mana','stamina','gold','kills']){
      const value=save.player[key];if(Number.isFinite(value))this.player[key]=clamp(value,0,key==='kills'?999999:9999);
    }
    this.clock.minutes=clamp(save.clock,0,1439);this.clock.day=Math.max(1,Math.floor(save.day)||1);
    this.questStep=clamp(Math.floor(save.questStep),0,2);
    if(save.version>=2){
      this.inventory=sanitizedInventory(save.inventory);
      // Ensure at least one usable weapon and armor if a save is malformed.
      for(const id of ['wanderers-blade','traveler-cloak'])if(!hasItem(this.inventory,id))this.inventory.push({id,quantity:1});
      for(const type of ['weapon','armor']){
        const id=save.equipment?.[type];
        if(ITEMS[id]?.type===type&&hasItem(this.inventory,id))this.equipment[type]=id;
      }
      const savedEnemies=new Map((Array.isArray(save.enemies)?save.enemies:[]).filter(e=>typeof e?.id==='string').map(e=>[e.id,e]));
      for(const enemy of this.enemies){
        const saved=savedEnemies.get(enemy.id);if(!saved)continue;
        enemy.health=Number.isFinite(saved.health)?clamp(saved.health,0,enemy.maxHealth):enemy.maxHealth;
        enemy.alive=Boolean(saved.alive)&&enemy.health>0;
        enemy.state=enemy.alive?'idle':'dead';
        enemy.respawnTimer=Number.isFinite(saved.respawnTimer)?clamp(saved.respawnTimer,0,120):0;
        if(Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&!this.world.isBlocked(saved.x,saved.y,enemy.radius)){
          enemy.x=saved.x;enemy.y=saved.y;
        }
      }
      this.drops=(Array.isArray(save.drops)?save.drops:[]).filter(drop=>ITEMS[drop?.itemId]&&Number.isFinite(drop.x)&&Number.isFinite(drop.y)&&!this.world.isBlocked(drop.x,drop.y,5)).slice(0,150).map((drop,i)=>({uid:`loot-${i+1}`,itemId:drop.itemId,x:drop.x,y:drop.y}));
      this.dropCounter=this.drops.length+1;
    }
    if(save.version>=3){
      this.farm=loadFarm(save.farm);this.social=loadSocial(save.social);
      this.homeOwned=Boolean(save.homeOwned);this.herbGatherDay=Number.isInteger(save.herbGatherDay)?save.herbGatherDay:0;
    } else {
      // Phases 1 and 2 did not have seed inventory; reward starters only once at migration.
      if(!hasItem(this.inventory,'turnip-seed'))addItem(this.inventory,'turnip-seed',4);
    }
    if(save.version<4){ // Existing save: start Phase 4 rival captains at full health.
      for(const c of this.nemesis.captains){const e=this.enemies.find(e=>e.id===c.id);if(e){e.alive=true;e.state='idle';e.health=e.maxHealth;}}
    }
    syncNemesis(this);
    this.worldEvent=eventForDay(this.clock.day);
    this.npcs=getActiveNpcs(this.clock);
    // Loading an old save at zero health should still let the player rest and recover.
    this.player.health=Math.max(1,this.player.health);
    this.start();this.toast(save.version<5?'Previous save imported! Phase 5 Convergence storyline is now playable.':'Welcome back. Your world and its history remember you.');
  }
  start(){
    this.started=true;this.paused=false;this.modalOpen=false;this.renderer.initialCamera=true;
    $('start-overlay').classList.add('hidden');$('pause-overlay').classList.add('hidden');$('death-overlay').classList.add('hidden');$('modal-backdrop').classList.add('hidden');
    $('game-hud').style.display='block';this.input.reset();
  }
  pause(){if(!this.started||this.player.dead)return;this.paused=true;this.input.reset();$('pause-overlay').classList.remove('hidden');}
  resume(){this.paused=false;this.input.reset();$('pause-overlay').classList.add('hidden');}
  mainMenu(){
    this.save(false);this.paused=false;this.started=false;this.modalOpen=false;
    this.input.reset();$('death-overlay').classList.add('hidden');$('modal-backdrop').classList.add('hidden');$('pause-overlay').classList.add('hidden');$('start-overlay').classList.remove('hidden');this.refreshContinueButton();
  }
  save(notify=true){if(!this.started)return;const success=saveGame(this);if(notify)this.toast(success?'Progress saved to this browser.':'Unable to save; check browser storage settings.');}
  effect(x,y,text,color='#ffddab'){this.fx.push({x,y,text,color,life:1,maxLife:1});if(this.fx.length>60)this.fx.shift();}
  onEnemyKilled(enemy){
    this.player.kills++;onCaptainKilled(this,enemy);if(enemy.captain)awardSkill(this,'intimidation',2);const loot=generateLoot(this,enemy);
    const sigil=onStoryBossKilled(this,enemy);if(sigil){this.effect(enemy.x,enemy.y-85,`${sigil.name.toUpperCase()}!`,'#ffe8ad');this.audio.sound('sigil');}else this.audio.sound('kill');
    this.toast(enemy.elite?`${enemy.name} defeated! ${sigil?sigil.name+' recovered. ':''}Legendary loot: ${loot.item.name}.`:`${enemy.name} defeated · ${loot.item.name} dropped.`);
    // Defeating the elite is a one-time milestone. Ordinary enemies respawn after leaving the area.
    if(enemy.elite)this.save(false);
  }
  onPlayerDefeated(source=null){
    const promoted=onCaptainVictory(this,source);
    if(promoted)this.effect(source.x,source.y-65,`RANK ${promoted.rank}`,'#f4c17d');
    this.input.reset();$('death-overlay').classList.remove('hidden');this.toast('You have fallen. Return to the campfire to continue.');
  }
  respawn(){
    const p=this.player;p.dead=false;p.health=100;p.stamina=100;p.mana=60;
    p.invulnTimer=2;p.invulnerable=true;p.attack=null;p.parryTimer=0;p.rolling=0;
    p.x=this.world.spawn.x;p.y=this.world.spawn.y;
    p.gold=Math.max(0,p.gold-Math.floor(p.gold*.15));
    for(const e of this.enemies)if(e.alive){e.state='idle';e.attackWait=1.5;e.x=e.homeX;e.y=e.homeY;}
    this.renderer.initialCamera=true;$('death-overlay').classList.add('hidden');this.toast('You awaken near Wayfarer’s Rest. 15% of your gold was lost.');
  }
  nearbyFarmPlot(){return nearestPlot(this.farm,this.player.x,this.player.y);}
  nearbyNpc(){return nearestNpc(this.npcs,this.player.x,this.player.y);}
  nearLandmark(id,max=82){const mark=this.world.landmarks.find(m=>m.id===id);return Boolean(mark&&Math.hypot(this.player.x-mark.x,this.player.y-mark.y)<max);}
  onNewDay(){
    const grown=advanceFarmDay(this.farm,this.clock.season,this.clock.weather);
    this.worldEvent=eventForDay(this.clock.day);
    this.npcs=getActiveNpcs(this.clock);
    const returned=advanceNemesisDay(this);
    this.toast(`Day ${this.clock.day} · ${this.worldEvent.name} · ${this.clock.season} ${this.clock.seasonDay}/7${grown?' · crops grew!':''}${returned?' · captains returned!':''}`);
  }
  restUntilMorning(){
    if(!this.nearLandmark('cottage')&&!this.nearLandmark('fire'))return this.toast('Rest at the Fallow Cottage or village campfire.');
    this.clock.nextMorning();this.onNewDay();
    this.player.health=100;this.player.stamina=100;this.player.mana=60;
    this.npcs=getActiveNpcs(this.clock);this.closeModal();this.save(false);
  }
  openFarm(plot){this.openModal('THE FALLOWS','Your Farming Plot',farmMarkup(this,plot));}
  openNpc(id){
    const npc=NPCS.find(n=>n.id===id);if(!npc)return;
    this.openModal('LIFE IN THE VALLEY',npc.name+(npc.shop?' · The Seed Merchant':''),npc.shop?merchantMarkup(this):npcMarkup(this,id));
  }
  openHome(){this.openModal('ESTATE & LEGACY','The Fallow Cottage',cottageMarkup(this));}
  openCrafting(){this.openModal('CRAFTING & COOKING','The Village Forge',craftingMarkup(this));}
  openLife(){this.openModal('LIFE-SIM · PHASE 3','A Living Valley',lifeMarkup(this));}
  performLifeAction(action){
    const segments=action.split(':'),root=segments[0];let result={ok:false,message:'Action not available.'};
    if(root==='farm'){
      const plot=this.farm.find(p=>p.id===segments[2]);
      result=workPlot(this,segments[2],segments[1],segments[3]);
      this.toast(result.message);if(result.ok&&segments[1]==='harvest')awardSkill(this,'survival',2);if(result.ok&&plot)this.openFarm(plot);return;
    }
    if(root==='talk'||root==='gift'||root==='marry'){
      const id=segments[1];const npc=this.nearbyNpc();
      if(!npc||npc.id!==id)return this.toast('Move closer to this person.');
      result=root==='talk'?talkTo(this,id):root==='gift'?giftTo(this,id,segments[2]):marry(this,id);
      if(result.ok)awardSkill(this,'persuasion',root==='gift'?2:1);this.toast(result.message);if(result.ok)this.openNpc(id);return;
    }
    if(root==='buy'||root==='sell'){
      if(this.nearbyNpc()?.id!=='bram')return this.toast('Visit Bram in person to trade.');
      result=root==='buy'?buySeed(this,segments[1]):sellHarvest(this,segments[1]);
      this.toast(result.message);if(result.ok)this.openNpc('bram');return;
    }
    if(root==='craft'){
      result=craft(this,segments[1]);if(result.ok)awardSkill(this,'arcana',2);this.toast(result.message);if(result.ok)this.openCrafting();return;
    }
    if(root==='home'){
      if(!this.nearLandmark('cottage'))return this.toast('Return to the cottage to manage your estate.');
      if(segments[1]==='claim'){
        if(this.homeOwned)return;
        if(this.player.gold<50)return this.toast('You need 50 gold to claim this cottage.');
        this.player.gold-=50;this.homeOwned=true;result={ok:true,message:'The Fallow Cottage is now yours!'};
      } else if(segments[1]==='rest'){this.restUntilMorning();return;}
      else if(segments[1]==='family')result=startFamily(this,segments[2]);
      else if(segments[1]==='retire'){
        result=retireToHeir(this);
        if(result.ok){const inheritedGold=this.player.gold, inheritedKills=this.player.kills;
          this.player=makePlayer(this.world.spawn);this.player.gold=inheritedGold;this.player.kills=inheritedKills;
          this.player.invulnTimer=2;this.player.invulnerable=true;
          this.clock.nextMorning();this.onNewDay();this.renderer.initialCamera=true;
        }
      }
      this.toast(result.message);if(result.ok){this.openHome();this.save(false);}return;
    }
  }
  interact(){
    if(!this.started||this.paused||this.modalOpen||this.player.dead)return;
    const p=this.player,drop=nearbyDrop(this),target=this.world.getNearby(p.x,p.y),npc=this.nearbyNpc(),plot=this.nearbyFarmPlot(),captain=nearestDomination(this);
    const options=[
      captain&&{d:Math.hypot(p.x-captain.x,p.y-captain.y),kind:'captain',value:captain},
      drop&&{d:Math.hypot(p.x-drop.x,p.y-drop.y),kind:'drop',value:drop},
      npc&&{d:Math.hypot(p.x-npc.x,p.y-npc.y),kind:'npc',value:npc},
      plot&&{d:Math.hypot(p.x-(plot.x*32+16),p.y-(plot.y*32+16)),kind:'plot',value:plot},
      target&&{d:Math.hypot(p.x-target.x,p.y-target.y),kind:'landmark',value:target}
    ].filter(Boolean).sort((a,b)=>a.d-b.d);
    if(!options.length)return this.toast('Move closer to a villager, plot, drop, or landmark to interact.');
    const selected=options[0];
    if(selected.kind==='captain')return this.openDomination(selected.value);
    if(selected.kind==='drop'){const result=collectDrop(this,selected.value);if(result){awardSkill(this,'sleight',1);this.audio.sound('pickup');}return result;}
    if(selected.kind==='npc')return this.openNpc(selected.value.id);
    if(selected.kind==='plot')return this.openFarm(selected.value);
    const mark=selected.value;let extra='';
    if(mark.id==='stone'&&this.questStep===0){this.questStep=1;extra='<p style="color:#e6c58c">✧ Objective updated: A Voice at the Crossroads</p>';}
    if(mark.id==='vell'&&this.questStep===1){this.questStep=2;extra='<p style="color:#e6c58c">✧ Introductory quest complete. The road is yours.</p>';}
    if(mark.id==='convergence-altar')return this.openAltar();
    if(STORY_SCENES[mark.id])return this.openStoryLandmark(mark.id);
    if(mark.id==='fire'){
      this.player.health=100;this.player.stamina=100;this.player.mana=60;
      return this.openModal('WAYFARER’S REST','The Crossroads Campfire','<p>You feel your strength return. Rest until the next morning to grow your crops and advance the seasons.</p><div class="life-actions"><button class="life-button" data-action="campfire:rest">☾ Rest until morning</button></div>');
    }
    if(mark.id==='farm')return this.openModal('THE FALLOWS','Farm Field Guide',farmGuideMarkup(this));
    if(mark.id==='cottage')return this.openHome();
    if(mark.id==='forge')return this.openCrafting();
    if(mark.id==='herb-patch'){
      if(this.herbGatherDay===this.clock.day)return this.toast('The patch needs until tomorrow to regrow.');
      this.herbGatherDay=this.clock.day;addItem(this.inventory,'herb',2);
      return this.toast('Gathered 2 × Moonmint Herbs. Find new leaves tomorrow.');
    }
    if(SCENES[mark.id])return this.openDialogue(mark.id);
    this.openModal('ENCOUNTER',mark.name,`<p>${mark.text}</p>${extra}`);
  }
  action(action){
    if(['farm','talk','gift','marry','buy','sell','craft','home'].includes(action.split(':')[0])){this.performLifeAction(action);return;}
    if(action==='story-board'){this.openStory();return;}
    if(action==='story:show-alignment'){if(this.nearLandmark('convergence-altar'))this.openAltar();else this.toast('Find the Convergence Altar north of the crossroads.');return;}
    if(action.startsWith('story:alignment:')){if(!this.nearLandmark('convergence-altar'))return this.toast('You must choose your oath at the Altar.');const result=chooseAlignment(this,action.slice(16));this.toast(result.message);if(result.ok){this.openAltar();this.save(false);}return;}
    if(action==='story:finish'){if(!this.nearLandmark('convergence-altar'))return this.toast('Return to the Convergence Altar to finish this story.');const result=finishStory(this);this.toast(result.message);if(result.ok){this.save(false);this.closeModal();this.showEpilogue();this.audio.sound('ending');}return;}
    if(action==='close-epilogue'){this.modalOpen=false;$('epilogue-overlay').classList.add('hidden');return;}
    if(action==='audio'){const enabled=this.audio.toggle();$('audio-toggle').textContent=enabled?'♫ Sound ON':'♪ Sound OFF';this.toast(enabled?'Original ambient audio enabled.':'Sound muted or unavailable in this browser.');return;}
    if(action==='export-save'){this.save(false);const file=exportSave();if(!file)return this.toast('No saved progress available.');const blob=new Blob([file],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='life-of-p-save.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);this.toast('Save exported as a JSON backup.');return;}
    if(action==='import-save'){$('save-import-file')?.click();return;}
    if(action==='dialogue-guide'){this.openModal('FATE & SKILL CHECKS','The d20 Chronicle',dialogueGuideMarkup(this));return;}
    if(action.startsWith('dialogue-open:')){const scene=action.slice(14);if(this.nearLandmark(scene))this.openDialogue(scene);else this.toast('Visit the location to start this conversation.');return;}
    if(action.startsWith('dialogue:')){const [,scene,choice]=action.split(':');if(!this.nearLandmark(scene))return this.toast('You are too far from the encounter.');const result=resolveDialogue(this,scene,choice);if(result.ok){this.toast(result.message);this.openDialogue(scene,result);this.save(false);}else this.toast(result.message);return;}
    if(action.startsWith('dominate:')){const result=dominateCaptain(this,action.slice(9),(skill,dc)=>skillCheck(this,skill,dc));if(result.ok){awardSkill(this,'intimidation',2);this.closeModal();this.toast(result.message);this.save(false);}else this.toast(result.message);return;}
    if(action==='campfire:rest'){this.restUntilMorning();return;}
    if(action.startsWith('equip:')){if(equipItem(this,action.slice(6)))this.refreshInventory();return;}
    if(action.startsWith('use:')){if(useItem(this,action.slice(4)))this.refreshInventory();return;}
    switch(action){
      case 'new-game':this.newGame();break;case 'continue-game':this.continueGame();break;
      case 'pause':this.pause();break;case 'resume':this.resume();break;
      case 'save':this.save();break;case 'main-menu':this.mainMenu();break;
      case 'respawn':this.respawn();break;case 'close-modal':this.closeModal();break;
      case 'interact':this.interact();break;
      case 'dodge':if(this.started&&!this.paused&&!this.modalOpen&&startRoll(this.player,this.input.direction()))this.audio.sound('roll');break;
      case 'light-attack':if(this.started&&!this.paused&&!this.modalOpen&&startAttack(this.player,'light'))this.audio.sound('light');break;
      case 'heavy-attack':if(this.started&&!this.paused&&!this.modalOpen&&startAttack(this.player,'heavy'))this.audio.sound('heavy');break;
      case 'parry':if(this.started&&!this.paused&&!this.modalOpen&&startParry(this.player))this.audio.sound('parry');break;
      case 'journal':this.openJournal();break;case 'map':this.openMap();break;
      case 'inventory':this.openModal('EQUIPMENT & LOOT','Traveler’s Inventory',inventoryMarkup(this));break;
      case 'nemesis':this.openModal('RIVALS','Nemesis Hierarchy',nemesisMarkup(this));break;
      case 'story-board':this.openStory();break;
      case 'life':this.openLife();break;
      case 'farm-guide':this.openModal('THE FALLOWS','Farming Field Guide',farmGuideMarkup(this));break;
      case 'crafting':this.openCrafting();break;
      case 'relationships':this.openModal('VILLAGE FRIENDSHIPS','People of the Valley',relationshipOverview(this));break;
      case 'homestead':this.openHome();break;
      case 'controls':this.openControls();break;
    }
  }
  openStory(){this.openModal('ACT II · THE CONVERGENCE','Chronicle of Ashes',storyMarkup(this));}
  openAltar(){this.openModal('THE CONVERGENCE OF ASHES','The Unwritten Altar',altarMarkup(this));}
  openStoryLandmark(id){const scene=STORY_SCENES[id];const bossByLandmark={'elderbough':'thorn-matriarch','silvermere-ward':'drowned-herald','cinder-gate':'cinder-regent'};const e=this.enemies.find(e=>e.kind===bossByLandmark[id]);this.openModal('THE FRACTURED WORLD',scene.name,`<p>${scene.intro}</p>${e?`<p><strong>${e.name}</strong> — ${e.alive?'Alive. Recover this sigil by defeating the guardian.':'Defeated. This ward has been reclaimed.'}</p>`:''}<button class="life-button" data-action="story-board">View your destiny (O)</button>`);}
  showEpilogue(){const overlay=$('epilogue-overlay');overlay.innerHTML=epilogueMarkup(this);overlay.classList.remove('hidden');this.modalOpen=true;this.input.reset();}
  openDialogue(scene,result=null){this.openModal('FATE & CHOICE','Branching Dialogue',dialogueMarkup(this,scene,result));}
  openDomination(enemy){this.openModal('RIVAL ENCOUNTER','A Captain’s Fate',dominationMarkup(this,enemy));}
  refreshInventory(){if(this.modalOpen&&$('modal-eyebrow').textContent==='EQUIPMENT & LOOT')$('modal-body').innerHTML=inventoryMarkup(this);}
  openModal(eyebrow,title,body){
    if(!this.started||this.paused||this.player.dead)return;
    $('modal-eyebrow').textContent=eyebrow;$('modal-title').textContent=title;$('modal-body').innerHTML=body;
    $('modal-backdrop').classList.remove('hidden');this.modalOpen=true;this.input.reset();
  }
  closeModal(){this.modalOpen=false;$('modal-backdrop').classList.add('hidden');this.input.reset();}
  openJournal(){
    const quest=storyObjective(this)||QUEST_STEPS[Math.min(2,this.questStep)];
    const bossList=this.enemies.filter(e=>e.elite);
    this.openModal('TRAVELER’S LOG','Journey Journal',`<div class="tag">${this.questStep<2?'ACT I · THE ASHEN VERGE':'ACT II · THE CONVERGENCE OF ASHES'}</div><div class="objective-card"><strong>${quest.name}</strong><p>${quest.detail||quest.description}</p></div><h3>The World Beyond the Crossroads</h3><p>Four named bosses guard the Verge. Your fate is decided at the Convergence Altar, north of town, after you have answered Vell.</p><div class="phase-card"><span class="eyebrow">LEGENDARY ENCOUNTERS</span><ul class="feature-list">${bossList.map(e=>`<li>${e.alive?'○':'✓'} ${e.name}${e.alive?' — undefeated':' — defeated'}</li>`).join('')}</ul></div><p class="subtle">Press O to open the Convergence Chronicle and track your three sigils, daily world events, and final ending. The Nemesis board (N) and the village life-sim (L) remain available.</p><button class="life-button" data-action="story-board">OPEN STORY CHRONICLE · O</button>`);
  }
  openMap(){
    this.openModal('EXPLORATION','World Map',`<canvas id="large-map" class="map-large" width="768" height="576" aria-label="Full map of the Ashen Verge"></canvas><div class="legend"><span><i style="background:#fff4db"></i>Your location</span><span><i style="background:#eaa18a"></i>Hostile patrol</span><span><i style="background:#f6ca76"></i>Elite Warden</span><span><i style="background:#daba82"></i>Landmarks</span></div><p class="subtle" style="margin-top:15px">Enemy markers show their current positions. The elite is in the northeastern ruins.</p>`);
    this.renderer.drawMap($('large-map'),this);
  }
  openControls(){
    const controls=[['Story / destiny','O'],['Toggle original ambient sound','Sound button'],['Move','W A S D / Arrow keys'],['Sprint','Hold Shift'],['Light attack','F / Left click'],['Heavy attack','R / Right click'],['Timed parry','Q'],['Dodge-roll','Space'],['Interact / Loot','E'],['Map','M'],['Journal','J'],['Inventory / Equip','I'],['Life-sim guide','L'],['Crafting','C'],['Nemesis captains','N'],['d20 dialogue','E at story landmarks'],['Help','H'],['Pause / Close','Esc']];
    this.openModal('FIELD GUIDE','Combat & Controls',`<div class="grid-two"><div><h3>Movement & Combat</h3>${controls.slice(0,7).map(([a,b])=>`<div class="control-item"><span>${a}</span><kbd>${b}</kbd></div>`).join('')}</div><div><h3>Menus & Navigation</h3>${controls.slice(7).map(([a,b])=>`<div class="control-item"><span>${a}</span><kbd>${b}</kbd></div>`).join('')}</div></div><h3 style="margin-top:22px">Survival Tips</h3><ul class="feature-list"><li>Red circles mark an incoming enemy swing. Parry just before the strike, or dodge through it.</li><li>Heavy attacks use more stamina but can break enemy posture. You can follow with another strike while they stagger.</li><li>Attack in the direction your character is facing; movement changes your facing.</li><li>Collect glowing drops with E, then open Inventory (I) to equip stronger weapons or armor.</li><li>Use an Ember Flask from inventory to heal; rest at the village campfire for a full recovery.</li><li>Normal foes respawn after leaving the area. Defeat the Ashen Warden once for a Legendary weapon.</li></ul>`);
  }
  toast(message){const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.add('hidden'),3600);}
  handleKeyboard(){
    if(this.input.consume('Escape')){
      if(!$('epilogue-overlay').classList.contains('hidden'))this.action('close-epilogue');else if(this.modalOpen)this.closeModal();else if(this.paused)this.resume();else if(this.started&&!this.player.dead)this.pause();return;
    }
    if(!this.started||this.paused||this.modalOpen||this.player.dead)return;
    if(this.input.consume('Space')&&startRoll(this.player,this.input.direction()))this.audio.sound('roll');
    if(this.input.consume('KeyF')&&startAttack(this.player,'light'))this.audio.sound('light');
    if(this.input.consume('KeyR')&&startAttack(this.player,'heavy'))this.audio.sound('heavy');
    if(this.input.consume('KeyQ'))startParry(this.player);
    if(this.input.consume('KeyE'))this.interact();
    if(this.input.consume('KeyM'))this.openMap();
    if(this.input.consume('KeyJ'))this.openJournal();
    if(this.input.consume('KeyI'))this.action('inventory');
    if(this.input.consume('KeyN'))this.action('nemesis');
    if(this.input.consume('KeyO'))this.openStory();
    if(this.input.consume('KeyH'))this.openControls();
    if(this.input.consume('KeyL'))this.openLife();
    if(this.input.consume('KeyC'))this.openCrafting();
  }
  loop(time){
    const dt=Math.min((time-this.lastTime)/1000||.016,.05);this.lastTime=time;
    this.handleKeyboard();
    if(this.started&&!this.paused&&!this.modalOpen&&!this.player.dead){
      this.player.eventRegen=this.worldEvent.staminaRegen*(this.story.alignment==='civilian'?1.15:1);
      updateMovement(this.player,this.world,this.input,dt);
      updatePlayerCombat(this,dt);
      updateEnemies(this,dt);
      updateRecruits(this,dt);
      this.audio.update(this,dt);
      const daysElapsed=this.clock.update(dt);
      if(daysElapsed)for(let i=0;i<daysElapsed;i++)this.onNewDay();
      this.npcs=getActiveNpcs(this.clock);
      this.fx=this.fx.filter(f=>(f.life-=dt)>0);
      this.saveTimer+=dt;if(this.saveTimer>=30){this.save(false);this.saveTimer=0;}
    }
    this.renderer.draw(this,dt);
    if(this.started){updateHUD(this);this.renderer.drawMap($('minimap-canvas'),this);}
    this.input.endFrame();requestAnimationFrame(t=>this.loop(t));
  }
}
new Game();
