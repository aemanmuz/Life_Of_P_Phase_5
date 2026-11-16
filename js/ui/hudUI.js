import {PLAYER_STATS} from '../systems/combat.js';
import {ITEMS} from '../data/items.js';
import {nearbyDrop} from '../systems/loot.js';
import {QUEST_STEPS} from '../data/quests.js';
import {storyObjective} from '../systems/story.js';
import {nearestDomination} from '../systems/nemesis.js';
const byId=id=>document.getElementById(id);
const setWidth=(id,value,max)=>{byId(id).style.width=`${Math.max(0,Math.min(100,value/max*100))}%`;};
export function updateHUD(game){
  const p=game.player;
  setWidth('health-bar',p.health,PLAYER_STATS.maxHealth);setWidth('mana-bar',p.mana,PLAYER_STATS.maxMana);setWidth('stamina-bar',p.stamina,PLAYER_STATS.maxStamina);
  byId('health-value').textContent=`${Math.ceil(p.health)} / ${PLAYER_STATS.maxHealth}`;
  byId('mana-value').textContent=`${Math.ceil(p.mana)} / ${PLAYER_STATS.maxMana}`;
  byId('stamina-value').textContent=`${Math.ceil(p.stamina)} / ${PLAYER_STATS.maxStamina}`;
  byId('gold-value').textContent=p.gold;
  byId('equipped-weapon').textContent=ITEMS[game.equipment.weapon]?.name||'Unarmed';
  byId('time-label').textContent=game.clock.formatted;byId('time-period').textContent=game.clock.period;
  byId('date-label').textContent=`${game.clock.season} ${game.clock.seasonDay}/7 · Year ${game.clock.year} · Day ${game.clock.day}`;
  const weather=byId('weather-label');if(weather)weather.textContent=game.clock.weather==='RAIN'?'☂ RAINY DAY':'✧ CLEAR SKY';
  const gen=byId('generation-label');if(gen)gen.textContent=`GEN ${game.social?.generation||1}`;
  const name=byId('player-name');if(name)name.textContent=game.social?.activeName||'Wanderer';
  byId('time-progress').style.width=`${game.clock.minutes/1440*100}%`;
  byId('weather-icon').textContent=game.clock.weather==='RAIN'?'☂':game.clock.lightLevel>.5?'☾':'☀';
  byId('region-name').textContent=game.world.getZone(p.x,p.y);
  const quest=storyObjective(game)||QUEST_STEPS[Math.min(game.questStep,2)];
  byId('quest-name').textContent=quest.name;byId('quest-description').textContent=quest.description;
  byId('coords').textContent=`X ${String(Math.floor(p.x/32)).padStart(2,'0')} · Y ${String(Math.floor(p.y/32)).padStart(2,'0')}`;
  const ready=byId('roll-ready');
  ready.textContent=p.rollCooldown<=0&&p.stamina>=PLAYER_STATS.rollStaminaCost?'● READY':`◌ ${p.rollCooldown>0?p.rollCooldown.toFixed(1)+'s':'LOW STAMINA'}`;
  ready.classList.toggle('cooling',p.rollCooldown>0||p.stamina<PLAYER_STATS.rollStaminaCost);
  const nearby=game.world.getNearby(p.x,p.y),drop=nearbyDrop(game);
  const npc=game.nearbyNpc?.(),plot=game.nearbyFarmPlot?.(),captain=nearestDomination(game);
  const available=[
    captain&&{d:Math.hypot(p.x-captain.x,p.y-captain.y),label:`Dominate ${captain.name}`},
    drop&&{d:Math.hypot(p.x-drop.x,p.y-drop.y),label:`Pick up ${ITEMS[drop.itemId]?.name||'item'}`},
    npc&&{d:Math.hypot(p.x-npc.x,p.y-npc.y),label:`Speak with ${npc.name}`},
    plot&&{d:Math.hypot(p.x-(plot.x*32+16),p.y-(plot.y*32+16)),label:plot.cropId?'Tend crop':'Work farm plot'},
    nearby&&{d:Math.hypot(p.x-nearby.x,p.y-nearby.y),label:nearby.prompt}
  ].filter(Boolean).sort((a,b)=>a.d-b.d);
  byId('interact-prompt').classList.toggle('hidden',available.length===0);
  if(available[0])byId('interact-label').textContent=available[0].label;
  const elite=game.enemies.filter(e=>e.elite&&e.alive&&Math.hypot(p.x-e.x,p.y-e.y)<440).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
  const boss=byId('boss-hud');boss.classList.toggle('hidden',!elite);
  if(elite){byId('boss-name-text').textContent=`✦ ${elite.name.toUpperCase()}`;byId('boss-health').style.width=`${elite.health/elite.maxHealth*100}%`;byId('boss-health-value').textContent=`${elite.health} / ${elite.maxHealth}`;}
  const event=byId('world-event-label');if(event)event.textContent=`${game.worldEvent.icon} ${game.worldEvent.name.toUpperCase()}`;
  byId('kill-count').textContent=`${p.kills} ENEMIES DEFEATED`;
  byId('parry-state').textContent=p.parryCooldown>0?`${p.parryCooldown.toFixed(1)}s`:'READY';
  byId('light-state').textContent=p.stamina<15?'LOW STAMINA':p.attack?'ATTACKING':'READY';
  byId('heavy-state').textContent=p.stamina<34?'LOW STAMINA':p.attack?'ATTACKING':'READY';
}
