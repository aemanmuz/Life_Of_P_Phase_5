/** Phase 3 persistent farmland. Plot coordinates match the field painted in world.js. */
import {TILE} from '../engine/world.js';
import {addItem,removeItem,hasItem} from '../data/items.js';
export const CROPS=Object.freeze({
  turnip:{id:'turnip',name:'Ash Turnip',seed:'turnip-seed',seasons:['Spring','Autumn'],days:2,yield:2,sell:9,color:'#d6a5c7'},
  wheat:{id:'wheat',name:'Sunwheat',seed:'wheat-seed',seasons:['Spring','Summer'],days:3,yield:3,sell:8,color:'#e5c46a'},
  pumpkin:{id:'pumpkin',name:'Ember Pumpkin',seed:'pumpkin-seed',seasons:['Summer','Autumn'],days:4,yield:2,sell:20,color:'#e99747'},
  frostroot:{id:'frostroot',name:'Frostroot',seed:'frostroot-seed',seasons:['Winter'],days:3,yield:2,sell:16,color:'#9bc6e3'},
});
const clampInt=(n,min,max,otherwise=min)=>Number.isInteger(n)?Math.max(min,Math.min(max,n)):otherwise;
export function makeFarm(){
  const plots=[];
  for(let y=41;y<=46;y++)for(let x=35;x<=42;x++)plots.push({id:`${x}-${y}`,x,y,tilled:false,watered:false,cropId:null,growth:0});
  return plots;
}
export function loadFarm(raw){
  const base=makeFarm();if(!Array.isArray(raw))return base;
  const known=new Map(raw.filter(r=>r&&typeof r.id==='string').map(r=>[r.id,r]));
  return base.map(plot=>{
    const saved=known.get(plot.id);if(!saved)return plot;
    const crop=Object.hasOwn(CROPS,saved.cropId)?saved.cropId:null;
    return {...plot,tilled:Boolean(saved.tilled)||Boolean(crop),watered:Boolean(saved.watered),cropId:crop,growth:crop?clampInt(saved.growth,0,CROPS[crop].days):0};
  });
}
export function nearestPlot(farm,x,y,maxDistance=49){
  let closest=null,best=maxDistance;
  for(const plot of farm){const px=plot.x*TILE+TILE/2,py=plot.y*TILE+TILE/2,d=Math.hypot(x-px,y-py);if(d<best){best=d;closest=plot;}}
  return closest;
}
export function workPlot(game,plotId,operation,cropId){
  const plot=game.farm.find(p=>p.id===plotId);
  if(!plot||Math.hypot(game.player.x-(plot.x*TILE+16),game.player.y-(plot.y*TILE+16))>60)return {ok:false,message:'Get closer to this plot.'};
  let message='';
  if(operation==='till'&&!plot.tilled){plot.tilled=true;message='Soil tilled. Plant a seed to begin.';}
  else if(operation==='plant'&&plot.tilled&&!plot.cropId&&Object.hasOwn(CROPS,cropId)){
    const crop=CROPS[cropId];
    if(!crop.seasons.includes(game.clock.season))return {ok:false,message:`${crop.name} grows in ${crop.seasons.join(' / ')}.`};
    if(!removeItem(game.inventory,crop.seed))return {ok:false,message:`You need ${crop.name} seeds. Buy some from Bram.`};
    plot.cropId=cropId;plot.growth=0;plot.watered=false;message=`Planted ${crop.name}. Water it to grow.`;
  }
  else if(operation==='water'&&plot.tilled&&plot.cropId&&!plot.watered){plot.watered=true;message='Watered! This crop will grow overnight.';}
  else if(operation==='harvest'&&plot.cropId&&plot.growth>=CROPS[plot.cropId].days){
    const crop=CROPS[plot.cropId];addItem(game.inventory,plot.cropId,crop.yield);plot.cropId=null;plot.growth=0;plot.watered=false;message=`Harvested ${crop.yield} × ${crop.name}!`;
  }
  else return {ok:false,message:'This action is not available for the selected plot.'};
  return {ok:true,message};
}
export function advanceFarmDay(farm,season,weather){
  let grown=0;
  for(const p of farm){
    if(p.cropId){const crop=CROPS[p.cropId];if((p.watered||weather==='RAIN')&&crop.seasons.includes(season)&&p.growth<crop.days){p.growth++;grown++;}}
    p.watered=false;
  }
  return grown;
}
export function plantableCrops(inventory,season){return Object.values(CROPS).filter(c=>c.seasons.includes(season)&&hasItem(inventory,c.seed));}

/** Bram's trading prices: buy any available seasonal seed for 4g; sell one harvested crop. */
export function buySeed(game,cropId){
  const crop=CROPS[cropId];if(!crop||!crop.seasons.includes(game.clock.season)||game.player.gold<4)return {ok:false,message:'Seeds are unavailable this season or you lack gold.'};
  game.player.gold-=4;addItem(game.inventory,crop.seed);return {ok:true,message:`Purchased ${crop.name} seeds for 4 gold.`};
}
export function sellHarvest(game,cropId){
  const crop=CROPS[cropId];if(!crop||!removeItem(game.inventory,cropId))return {ok:false,message:'No harvest to sell.'};
  game.player.gold+=crop.sell;return {ok:true,message:`Sold ${crop.name} for ${crop.sell} gold.`};
}
