import {ITEMS,rarityColor} from '../data/items.js';
import {playerAttackPower,playerDefense} from '../systems/combat.js';
export function inventoryMarkup(game){
  const rows=game.inventory.filter(row=>ITEMS[row.id]&&row.quantity>0);
  const rarityCounts={};for(const row of rows)rarityCounts[ITEMS[row.id].rarity]=(rarityCounts[ITEMS[row.id].rarity]||0)+row.quantity;
  return `<div class="inventory-summary"><div><span class="eyebrow">EQUIPPED WEAPON</span><strong>${ITEMS[game.equipment.weapon]?.name||'None'}</strong><span>⚔ ${playerAttackPower(game)} base damage</span></div><div><span class="eyebrow">EQUIPPED ARMOR</span><strong>${ITEMS[game.equipment.armor]?.name||'None'}</strong><span>◈ ${playerDefense(game)} defense</span></div><div><span class="eyebrow">TRAVELER’S PURSE</span><strong>${game.player.gold} ◈</strong><span>${rows.reduce((total,row)=>total+row.quantity,0)} items collected</span></div></div>
    <h3>Your belongings</h3><div class="inventory-list">${rows.map(({id,quantity})=>{
      const item=ITEMS[id],equipped=game.equipment[item.type]===id;
      const stat=item.type==='weapon'?`⚔ ${item.damage} damage`:item.type==='armor'?`◈ ${item.defense} defense`:item.type==='consumable'?`✚ ${item.heal} HP`:item.type==='seed'?'Plant at the Fallows':item.type==='crop'?'Farm produce':'Crafting material';
      const action=item.type==='weapon'||item.type==='armor'?`<button class="equip-button" data-action="equip:${id}" ${equipped?'disabled':''}>${equipped?'EQUIPPED':'EQUIP'}</button>`:item.type==='consumable'?`<button class="equip-button" data-action="use:${id}" ${game.player.health>=100?'disabled':''}>USE</button>`:'';
      return `<div class="inventory-item"><span class="item-gem" style="--rarity:${rarityColor(item.rarity)}">◆</span><div class="item-detail"><strong>${item.name} ${quantity>1?`×${quantity}`:''}</strong><span style="color:${rarityColor(item.rarity)}">${item.rarity} · ${stat}</span><small>${item.description}</small></div>${action}</div>`;
    }).join('')}</div><p class="subtle">Enemy drops sparkle on the ground. Press <kbd>E</kbd> nearby to collect them. The Crownless Edge is exclusive to the Ashen Warden.</p>`;
}
