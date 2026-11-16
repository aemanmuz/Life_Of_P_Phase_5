import {ITEMS,addItem,removeItem,hasItem} from '../data/items.js';
const roll=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
/** Monsters drop gold immediately and tangible item pickups. Legendary is elite-only. */
export function generateLoot(game,enemy){
  const coins=enemy.elite?roll(enemy.kind==='cinder-regent'?340:175,enemy.kind==='cinder-regent'?390:250):enemy.kind==='hollow-stalker'?roll(13,27):roll(8,19);
  game.player.gold+=coins;game.effect(enemy.x,enemy.y-55,`+${coins} ◈`,'#efd18c');
  let itemId;
  if(enemy.elite)itemId=({'thorn-matriarch':'verdant-oath','drowned-herald':'tidebound-mail','cinder-regent':'cinderbrand'})[enemy.kind]||'crownless-edge';
  else {
    const chance=Math.random();
    if(chance<.10)itemId=Math.random()<.5?'dawncleaver':'sunken-plate';
    else if(chance<.36)itemId=Math.random()<.5?'waykeeper-edge':'emberguard-mail';
    else if(chance<.56)itemId=Math.random()<.5?'rusted-sabre':'patchwork-vest';
    else if(chance<.82)itemId='ember-flask';
    else itemId='ash-fragment';
  }
  const pickupX=game.world.isBlocked(enemy.x+12,enemy.y+5,5)?enemy.x:enemy.x+12;
  const drop={uid:`loot-${game.dropCounter++}`,itemId,x:pickupX,y:enemy.y};
  game.drops.push(drop);
  return {coins,item:ITEMS[itemId]};
}
export function nearbyDrop(game,maxDistance=55){
  let closest=null,best=maxDistance;
  for(const drop of game.drops){const d=Math.hypot(game.player.x-drop.x,game.player.y-drop.y);if(d<best){best=d;closest=drop;}}
  return closest;
}
export function collectDrop(game,drop){
  if(!drop||!ITEMS[drop.itemId])return false;
  addItem(game.inventory,drop.itemId);
  game.drops.splice(game.drops.indexOf(drop),1);
  game.toast(`Obtained ${ITEMS[drop.itemId].name} (${ITEMS[drop.itemId].rarity})`);
  return true;
}
export function equipItem(game,id){
  const item=ITEMS[id];if(!item||!['weapon','armor'].includes(item.type)||!hasItem(game.inventory,id))return false;
  game.equipment[item.type]=id;
  game.toast(`Equipped ${item.name}.`);return true;
}
export function useItem(game,id){
  const item=ITEMS[id];if(!item||item.type!=='consumable'||!hasItem(game.inventory,id)||game.player.dead||game.player.health>=100)return false;
  if(!removeItem(game.inventory,id))return false;
  const restored=Math.min(item.heal,100-game.player.health);
  game.player.health+=restored;game.effect(game.player.x,game.player.y-40,`+${restored}`,'#a9e6a9');
  game.toast(`Used ${item.name}: +${restored} health.`);return true;
}
