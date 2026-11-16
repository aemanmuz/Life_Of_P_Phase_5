/** Two relationship NPCs and a working farm merchant; schedules are deterministic. */
import {TILE} from '../engine/world.js';
export const NPCS=Object.freeze([
  {id:'mira',name:'Mira',title:'The Fallow Gardener',color:'#d5aa88',gift:'turnip',schedule:{morning:[43,43],afternoon:[43,45],evening:[55,41],night:[41,36]},lines:['The Fallows were empty for years. I’m glad someone is tending them.','A garden teaches patience more honestly than a sword.','This valley could become a home, if we let it.']},
  {id:'rowan',name:'Rowan',title:'The Wandering Scribe',color:'#b2cbd4',gift:'herb',schedule:{morning:[56,36],afternoon:[60,38],evening:[52,41],night:[62,38]},lines:['The old maps show lands no one remembers.','The quiet hours reveal the most about a person.','I used to think I belonged to the road. Maybe not anymore.']},
  {id:'bram',name:'Bram',title:'Village Seed Merchant',color:'#d3b66f',shop:true,schedule:{morning:[44,40],afternoon:[44,40],evening:[51,42],night:[58,38]},lines:['Seeds, prices, and a warm smile. Everything a farmer needs.']},
]);
export function getActiveNpcs(clock){
  const h=clock.hour,period=h>=6&&h<12?'morning':h>=12&&h<18?'afternoon':h>=18&&h<21?'evening':'night';
  return NPCS.map(n=>{const [x,y]=n.schedule[period];return {...n,x:x*TILE+16,y:y*TILE+16};});
}
export function nearestNpc(npcs,x,y,maxDistance=65){
  let result=null,best=maxDistance;
  for(const npc of npcs){const d=Math.hypot(x-npc.x,y-npc.y);if(d<best){result=npc;best=d;}}
  return result;
}
