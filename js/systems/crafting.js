import {addItem,removeItem} from '../data/items.js';
export const RECIPES=Object.freeze([
  {id:'herbal-flask',name:'Herbal Ember Flask',result:'ember-flask',amount:1,ingredients:{herb:2,'ash-fragment':1},description:'Restore health with foraged herbs and an ash fragment.'},
  {id:'field-stew-recipe',name:'Field Stew',result:'field-stew',amount:1,ingredients:{turnip:2,herb:1},description:'A nourishing meal that restores 55 HP.'},
  {id:'trail-rations',name:'Trail Rations',result:'trail-ration',amount:2,ingredients:{wheat:2,herb:1},description:'Prepare two small travel meals.'},
]);
export function canCraft(inventory,recipe){return Object.entries(recipe.ingredients).every(([id,qty])=>(inventory.find(r=>r.id===id)?.quantity||0)>=qty);}
export function craft(game,recipeId){
  const recipe=RECIPES.find(r=>r.id===recipeId);
  if(!recipe||!canCraft(game.inventory,recipe))return {ok:false,message:'Missing ingredients for this recipe.'};
  for(const [id,qty] of Object.entries(recipe.ingredients))removeItem(game.inventory,id,qty);
  addItem(game.inventory,recipe.result,recipe.amount);
  return {ok:true,message:`Crafted ${recipe.amount} × ${recipe.name}.`};
}
