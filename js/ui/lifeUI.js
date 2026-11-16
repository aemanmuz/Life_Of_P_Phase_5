import {ITEMS,hasItem} from '../data/items.js';
import {CROPS,plantableCrops} from '../systems/farming.js';
import {RECIPES,canCraft} from '../systems/crafting.js';
import {NPCS} from '../data/npcs.js';
import {heirReady} from '../systems/relationships.js';
const button=(action,text,disabled=false)=>`<button type="button" class="life-button" data-action="${action}" ${disabled?'disabled':''}>${text}</button>`;
const count=(game,id)=>game.inventory.find(row=>row.id===id)?.quantity||0;
const findNpc=id=>NPCS.find(n=>n.id===id);
export function farmMarkup(game,plot){
  const crop=plot.cropId?CROPS[plot.cropId]:null;
  const ready=crop&&plot.growth>=crop.days;
  const state=!plot.tilled?'Wild, untilled earth':!crop?'Ready for planting':ready?'Ready to harvest':`${crop.name} · Growth ${plot.growth}/${crop.days} days · ${plot.watered?'Watered':'Needs water'}`;
  let buttons='';
  if(!plot.tilled)buttons=button(`farm:till:${plot.id}`,'⚒ Till this soil');
  else if(!crop){const crops=plantableCrops(game.inventory,game.clock.season);buttons=crops.map(c=>button(`farm:plant:${plot.id}:${c.id}`,`❀ Plant ${c.name} (${count(game,c.seed)} seeds)`)).join('')||'<p>No suitable seeds in your inventory. Buy seasonal seeds from Bram near the crossroads.</p>';}
  else if(ready)buttons=button(`farm:harvest:${plot.id}`,`✦ Harvest ${crop.yield} × ${crop.name}`);
  else buttons=button(`farm:water:${plot.id}`,'♧ Water this crop',plot.watered);
  return `<div class="life-hero"><span>THE FALLOWS · PLOT ${plot.x-34} / ${plot.y-40}</span><h3>${state}</h3><p>Each watered night advances growth by one day. Rain can water your fields automatically; unsupported seasons pause growth.</p></div><div class="life-actions">${buttons}${button('life','Open life-sim guide')}</div><p class="subtle">Current season: ${game.clock.season}. Step onto another soil square and press E to select it.</p>`;
}
export function merchantMarkup(game){
  const crops=Object.values(CROPS).filter(c=>c.seasons.includes(game.clock.season));
  const sale=Object.values(CROPS).filter(c=>count(game,c.id)>0);
  return `<p>Bram buys your harvest and sells seeds for the current season. Your purse: <strong>${game.player.gold} gold</strong>.</p><h3>Buy seasonal seeds</h3><div class="life-card-grid">${crops.map(c=>`<div class="life-card"><strong>❀ ${c.name} Seeds</strong><small>${c.days} watered days · ${c.seasons.join(' / ')}</small>${button(`buy:${c.id}`,`Buy 1 · 4 gold`,game.player.gold<4)}</div>`).join('')}</div><h3>Sell your harvest</h3><div class="life-actions">${sale.map(c=>button(`sell:${c.id}`,`Sell ${c.name} (×${count(game,c.id)}) · ${c.sell} gold`)).join('')||'<span class="subtle">No produce to sell yet. Harvest your farm first.</span>'}</div>`;
}
export function npcMarkup(game,id){
  const npc=findNpc(id);if(!npc)return '<p>Unknown villager.</p>';
  const affinity=game.social.affinity[id]||0;
  const married=game.social.marriedTo===id;
  const gifts=['turnip','wheat','pumpkin','frostroot','herb'].filter(item=>hasItem(game.inventory,item));
  const lastTalk=game.social.talkedOn[id]===game.clock.day,lastGift=game.social.giftedOn[id]===game.clock.day;
  const dialogue=npc.lines[affinity>=70?2:affinity>=35?1:0];
  return `<div class="life-hero"><span>${npc.title.toUpperCase()}</span><h3>“${dialogue}”</h3><p>${married?'Your spouse · ':'Friendship '} ${affinity}/100 ♥ ${'♥'.repeat(Math.min(5,Math.floor(affinity/20)))}${'♡'.repeat(5-Math.min(5,Math.floor(affinity/20)))}</p><div class="life-meter"><div style="width:${affinity}%"></div></div></div>
  <div class="life-actions">${button(`talk:${id}`,lastTalk?'Spoken today ✓':'Start a conversation (+10)',lastTalk)}
  ${gifts.map(item=>button(`gift:${id}:${item}`,`Gift ${ITEMS[item].name} ${item===npc.gift?'★':''}`,lastGift)).join('')||'<span class="subtle">Bring some farm produce or herbs to give a gift.</span>'}
  ${married?'<p class="subtle">Married · Visit your cottage to grow the family.</p>':button(`marry:${id}`,'♡ Propose marriage',affinity<70||!!game.social.marriedTo||!game.homeOwned)}</div>
  <p class="subtle">Speak once and give one gift per in-game day. A proposal needs 70 friendship and a claimed cottage.</p>`;
}
export function cottageMarkup(game){
  const partner=game.social.marriedTo?findNpc(game.social.marriedTo)?.name:null;
  const child=game.social.child;
  const age=child?Math.max(0,game.clock.day-child.bornDay):0;
  return `<div class="life-hero"><span>FALLOW COTTAGE · THE ASHEN VERGE</span><h3>${game.homeOwned?'A place to call home':'An abandoned home waits for its keeper'}</h3><p>${game.homeOwned?'Owned · Your equipment, farm, and gold will pass to future generations.':'Claim the cottage for 50 gold to unlock marriage and family.'}</p></div>
  <div class="life-actions">${!game.homeOwned?button('home:claim','Claim cottage · 50 gold',game.player.gold<50):''}
  ${button('home:rest','☾ Sleep until the next morning',!game.nearLandmark('cottage'))}
  ${partner?`<p class="subtle">Spouse: <strong>${partner}</strong> · Married on day ${game.social.marriedDay}.</p>`:'<p class="subtle">Not married yet. Befriend Mira or Rowan, then propose at 70 friendship.</p>'}
  ${partner&&!child?`${button('home:family:Eira','Welcome heir Eira',game.clock.day-game.social.marriedDay<2)}${button('home:family:Ari','Welcome heir Ari',game.clock.day-game.social.marriedDay<2)}`:''}
  ${child?`<p>Heir: <strong>${child.name}</strong> · Age ${age}/7 days ${heirReady(game.social,game.clock.day)?'· Grown':'· Growing'}</p>${button('home:retire',`Begin generation ${game.social.generation+1}`,!heirReady(game.social,game.clock.day))}`:''}</div>
  <p class="subtle">This is a playable simplified inheritance loop: retirement passes on your estate, inventory, equipment and gold. Combat death continues to use the existing campfire respawn mechanic.</p>`;
}
export function craftingMarkup(game){
  return `<div class="life-actions">${button("dialogue-open:forge","✧ Inspect ancient forge script (d20)",!game.nearLandmark("forge"))}</div><p>Crafting happens at the village forge (or open with <kbd>C</kbd>). Ingredients come from harvested crops, the daily herb patch, and defeated enemies.</p><div class="life-card-grid">${RECIPES.map(r=>`<div class="life-card"><strong>⚒ ${r.name}</strong><p>${r.description}</p><small>${Object.entries(r.ingredients).map(([id,n])=>`${ITEMS[id].name} ${count(game,id)}/${n}`).join(' · ')}</small>${button(`craft:${r.id}`,`Craft ×${r.amount}`,!canCraft(game.inventory,r))}</div>`).join('')}</div>`;
}
export function lifeMarkup(game){
 const totalPlanted=game.farm.filter(p=>p.cropId).length,ready=game.farm.filter(p=>p.cropId&&p.growth>=CROPS[p.cropId].days).length;
 const partner=game.social.marriedTo?findNpc(game.social.marriedTo)?.name:'Not married';
 return `<div class="life-stats"><div><span>SEASON</span><strong>${game.clock.season}</strong><small>Day ${game.clock.seasonDay} / 7 · Year ${game.clock.year}</small></div><div><span>FARMLAND</span><strong>${totalPlanted} crops</strong><small>${ready} ready to harvest</small></div><div><span>FAMILY</span><strong>Generation ${game.social.generation}</strong><small>${partner}</small></div></div>
 <div class="life-actions">${button('crafting','⚒ Open crafting')}${button('homestead','⌂ Homestead & Family')}${button('relationships','♡ Villager relationships')}${button('farm-guide','❀ Farming field guide')}</div>
 <h3>Living in the Ashen Verge</h3><p class="subtle">Current hero: ${game.social.activeName} · Family history: ${game.social.ancestors.length} prior generations.</p><ol class="life-steps"><li>Walk southwest to the brown plots at <strong>X 35–42, Y 41–46</strong>. Press <kbd>E</kbd> while standing near a plot. Till → plant → water → sleep → harvest.</li><li>Talk with <strong>Bram</strong> in the village by day to buy seeds and sell your crops.</li><li>Gather <strong>Moonmint herbs</strong> at the patch east of the fields once per day. Use the forge to craft healing food.</li><li>Speak to <strong>Mira</strong> or <strong>Rowan</strong> daily; gifts grow friendship faster. Claim the cottage and propose at 70 friendship.</li><li>Rest at the cottage or the campfire to advance days. Welcome and raise an heir, then retire to pass your estate to the next generation.</li></ol>
 <p class="subtle">Combat and the Phase 2 boss remain fully playable. Phase 4 Nemesis captains and branching d20 dialogue are active now (N for Nemesis Board).</p>`;
}
export function relationshipOverview(game){return `<h3>Your companions</h3>${NPCS.filter(n=>!n.shop).map(n=>`<div class="life-card"><strong>${n.name} · ${n.title}</strong><p>${game.social.affinity[n.id]} / 100 friendship ${game.social.marriedTo===n.id?'· Married':''}</p><div class="life-meter"><div style="width:${game.social.affinity[n.id]}%"></div></div><small>Usual location: near the village (${n.id==='mira'?'farmland':'crossroads'}). One talk and one gift daily.</small></div>`).join('')}<div class="life-actions">${button('life','Return to life guide')}</div>`;}
export function farmGuideMarkup(game){return `<p>Farming takes place in the field immediately southwest of the village.</p><div class="life-stats"><div><span>INVENTORY</span><strong>${count(game,'turnip-seed')} turnip seeds</strong><small>${count(game,'wheat-seed')} wheat · ${count(game,'pumpkin-seed')} pumpkin · ${count(game,'frostroot-seed')} frostroot</small></div><div><span>WEATHER</span><strong>${game.clock.weather}</strong><small>Rain auto-waters plants</small></div></div><h3>Crop calendar</h3><div class="life-card-grid">${Object.values(CROPS).map(c=>`<div class="life-card"><strong>❀ ${c.name}</strong><small>${c.seasons.join(' / ')} · ${c.days} days to grow · yields ${c.yield}</small></div>`).join('')}</div><p class="subtle">A watered crop gains one growth day when the next day begins. Harvest by interacting with its plot, then sell the produce at Bram's stall.</p><div class="life-actions">${button('life','Return to life guide')}</div>`;}
