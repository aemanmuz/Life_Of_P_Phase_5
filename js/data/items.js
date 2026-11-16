/** Phase 2 item catalog. All visual names and equipment are original to Life of P. */
export const RARITIES=['Common','Rare','Epic','Legendary'];
export const ITEMS=Object.freeze({
  'wanderers-blade':{id:'wanderers-blade',name:'Wanderer’s Blade',rarity:'Common',type:'weapon',damage:9,description:'A reliable iron sword from the old crossroads.'},
  'traveler-cloak':{id:'traveler-cloak',name:'Traveler’s Cloak',rarity:'Common',type:'armor',defense:2,description:'Weather-beaten cloth offering slight protection.'},
  'rusted-sabre':{id:'rusted-sabre',name:'Rusted Sabre',rarity:'Common',type:'weapon',damage:11,description:'Chipped steel, still sharp enough to survive.'},
  'patchwork-vest':{id:'patchwork-vest',name:'Patchwork Vest',rarity:'Common',type:'armor',defense:3,description:'Scraps of leather stitched together.'},
  'waykeeper-edge':{id:'waykeeper-edge',name:'Waykeeper’s Edge',rarity:'Rare',type:'weapon',damage:17,description:'A tempered blade favored by caravan guards.'},
  'emberguard-mail':{id:'emberguard-mail',name:'Emberguard Mail',rarity:'Rare',type:'armor',defense:6,description:'Chainmail resistant to the cold ash wind.'},
  'dawncleaver':{id:'dawncleaver',name:'Dawncleaver',rarity:'Epic',type:'weapon',damage:26,description:'A brilliant forged weapon recovered from a forgotten battlefield.'},
  'sunken-plate':{id:'sunken-plate',name:'Sunken Plate',rarity:'Epic',type:'armor',defense:10,description:'Heavy plates bearing a crest no one remembers.'},
  'crownless-edge':{id:'crownless-edge',name:'Crownless Edge',rarity:'Legendary',type:'weapon',damage:37,description:'A one-of-a-kind relic carried by the Ashen Warden.'},
  'verdant-oath':{id:'verdant-oath',name:'Verdant Oath',rarity:'Legendary',type:'weapon',damage:34,description:'A living thornblade reclaimed from the northern heartwood.'},
  'tidebound-mail':{id:'tidebound-mail',name:'Tidebound Mail',rarity:'Legendary',type:'armor',defense:15,description:'An ancient sea-ward that hums when the Silvermere tides turn.'},
  'cinderbrand':{id:'cinderbrand',name:'Cinderbrand',rarity:'Legendary',type:'weapon',damage:43,description:'A regal blade cut from the heart of the Convergence.'},
  'dawnward-armor':{id:'dawnward-armor',name:'Dawnward Regalia',rarity:'Legendary',type:'armor',defense:18,description:'Given to the Paragon who restored the three wards.'},
  'eclipse-sabre':{id:'eclipse-sabre',name:'Eclipse Sabre',rarity:'Legendary',type:'weapon',damage:49,description:'The blade of the Unwritten Sovereign.'},
  'hearthloom-coat':{id:'hearthloom-coat',name:'Hearthloom Coat',rarity:'Epic',type:'armor',defense:11,description:'Passed down in the peaceful legacy of the Fallows.'},
  'ember-flask':{id:'ember-flask',name:'Ember Flask',rarity:'Common',type:'consumable',heal:40,description:'Restore 40 health. Use it from your inventory.'},
  'ash-fragment':{id:'ash-fragment',name:'Ash Fragment',rarity:'Common',type:'material',description:'An eerie reagent harvested from enemy remains.'},
  'herb':{id:'herb',name:'Moonmint Herb',rarity:'Common',type:'material',description:'A fragrant herb gathered by the Fallows. Useful for cooking and medicine.'},
  'turnip-seed':{id:'turnip-seed',name:'Ash Turnip Seeds',rarity:'Common',type:'seed',description:'Grows in Spring and Autumn; ready in two watered days.'},
  'wheat-seed':{id:'wheat-seed',name:'Sunwheat Seeds',rarity:'Common',type:'seed',description:'Grows in Spring and Summer; ready in three watered days.'},
  'pumpkin-seed':{id:'pumpkin-seed',name:'Ember Pumpkin Seeds',rarity:'Common',type:'seed',description:'Grows in Summer and Autumn; ready in four watered days.'},
  'frostroot-seed':{id:'frostroot-seed',name:'Frostroot Seeds',rarity:'Common',type:'seed',description:'Grows in Winter; ready in three watered days.'},
  'turnip':{id:'turnip',name:'Ash Turnip',rarity:'Common',type:'crop',description:'Fresh valley produce. Sell it, gift it, or cook it.'},
  'wheat':{id:'wheat',name:'Sunwheat',rarity:'Common',type:'crop',description:'Golden grain for the road or market.'},
  'pumpkin':{id:'pumpkin',name:'Ember Pumpkin',rarity:'Rare',type:'crop',description:'A brilliant orange autumn harvest.'},
  'frostroot':{id:'frostroot',name:'Frostroot',rarity:'Rare',type:'crop',description:'A crisp root that survives winter.'},
  'field-stew':{id:'field-stew',name:'Field Stew',rarity:'Common',type:'consumable',heal:55,description:'Restores 55 health. Cooked from turnips and herbs.'},
  'trail-ration':{id:'trail-ration',name:'Trail Ration',rarity:'Common',type:'consumable',heal:25,description:'Restores 25 health. A light meal made from grain and herbs.'},
});
export const STARTER_GEAR=[ITEMS['wanderers-blade'],ITEMS['traveler-cloak']];
export function makeInventory(){return [{id:'wanderers-blade',quantity:1},{id:'traveler-cloak',quantity:1},{id:'ember-flask',quantity:2}];}
export function hasItem(inventory,id){return inventory.some(row=>row.id===id&&row.quantity>0);}
export function addItem(inventory,id,quantity=1){if(!ITEMS[id]||!Number.isInteger(quantity)||quantity<=0)return false;const row=inventory.find(item=>item.id===id);if(row)row.quantity+=quantity;else inventory.push({id,quantity});return true;}
export function removeItem(inventory,id,quantity=1){const row=inventory.find(item=>item.id===id);if(!row||row.quantity<quantity)return false;row.quantity-=quantity;if(!row.quantity)inventory.splice(inventory.indexOf(row),1);return true;}
export function sanitizedInventory(rows){if(!Array.isArray(rows))return makeInventory();const clean=[];for(const row of rows){if(ITEMS[row?.id]&&Number.isInteger(row.quantity)&&row.quantity>0&&row.quantity<=999)addItem(clean,row.id,row.quantity);}return clean;}
export function rarityColor(rarity){return {Common:'#bfc7bb',Rare:'#74c3da',Epic:'#bb9bff',Legendary:'#efc373'}[rarity]||'#bfc7bb';}
