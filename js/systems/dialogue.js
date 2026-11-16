/** Phase 4: finite branching conversations, reproducible modifiers and persistent d20 outcomes. */
import {ITEMS,addItem} from '../data/items.js';
export const SKILLS=['persuasion','intimidation','arcana','sleight','survival'];
export const SCENES=Object.freeze({
  vell:{name:'Vell, the Waykeeper',intro:'Vell studies you. “You carry an unwritten fate. How will you convince the crossroads to trust you?”',choices:[
    {id:'appeal',name:'Ask Vell to fund your expedition',skill:'persuasion',dc:11,success:'Vell admires your conviction and pays for supplies.',failure:'Vell declines, but offers a sympathetic nod.',reward:{gold:35}},
    {id:'threaten',name:'Demand the waykeeper’s tribute',skill:'intimidation',dc:16,success:'Vell reluctantly hands over a hidden purse.',failure:'The waykeeper refuses your threats.',reward:{gold:60}},
    {id:'scout',name:'Offer to scout the dangerous road',skill:'survival',dc:10,success:'Vell gives you healing herbs for the journey.',failure:'Vell says you have not yet proven your fieldcraft.',reward:{item:'herb',quantity:3}}
  ]},
  stone:{name:'The Old Waystone',intro:'Glyphs awaken beneath your fingers. The stone offers several ways of recovering its lost memory.',choices:[
    {id:'interpret',name:'Read the fragmented runes',skill:'arcana',dc:12,success:'You decipher a ritual and discover an old cache of ash reagents.',failure:'The sigils scramble before their meaning becomes clear.',reward:{item:'ash-fragment',quantity:4}},
    {id:'search',name:'Trace the ground for hidden offerings',skill:'survival',dc:11,success:'You uncover herbs placed beside the stone.',failure:'The soil offers nothing but dust.',reward:{item:'herb',quantity:2}}
  ]},
  ruins:{name:'The Ruined Sanctum',intro:'A locked reliquary lies under the rubble. Two approaches offer very different rewards.',choices:[
    {id:'pick',name:'Pick the ancient reliquary lock',skill:'sleight',dc:15,success:'The lock opens. You claim a rare forged blade.',failure:'The mechanism snaps shut and bruises your fingers.',reward:{item:'waykeeper-edge',quantity:1}},
    {id:'decode',name:'Read the warding script',skill:'arcana',dc:14,success:'The ward dissolves, revealing protective armor.',failure:'The script repels your attempt.',reward:{item:'emberguard-mail',quantity:1}}
  ]},
  sign:{name:'Crossroads Signpost',intro:'Fresh tracks cross the dusty road. Follow them, or investigate the sign’s hidden compartment.',choices:[
    {id:'tracks',name:'Follow the tracks to a supply cache',skill:'survival',dc:11,success:'Your tracking leads to a stash of trail supplies.',failure:'Rain has erased the trail.',reward:{item:'trail-ration',quantity:3}},
    {id:'compartment',name:'Quietly open a concealed panel',skill:'sleight',dc:12,success:'A secret traveller’s purse drops into your hand.',failure:'The panel refuses to budge.',reward:{gold:24}}
  ]},
  forge:{name:'The Village Forge',intro:'A cracked forge tablet holds techniques of another era. You can decode it or negotiate with its keeper.',choices:[
    {id:'script',name:'Understand the forge’s arcane recipe',skill:'arcana',dc:13,success:'The sigil hums, revealing valuable reagents.',failure:'The tablet remains unreadable.',reward:{item:'ash-fragment',quantity:5}},
    {id:'bargain',name:'Persuade the keeper to share surplus',skill:'persuasion',dc:12,success:'The keeper grants an extra healing flask.',failure:'The forge has no supplies to spare.',reward:{item:'ember-flask',quantity:2}}
  ]}
});
export function makeDialogue(){return {flags:{},history:[],skills:Object.fromEntries(SKILLS.map(s=>[s,0]))};}
export function loadDialogue(raw){const clean=makeDialogue();if(!raw||typeof raw!=='object')return clean;
 for(const skill of SKILLS)clean.skills[skill]=Number.isFinite(raw.skills?.[skill])?Math.max(0,Math.min(30,Math.floor(raw.skills[skill]))):0;
 for(const [scene,choice] of Object.entries(raw.flags||{}))if(SCENES[scene]&&SCENES[scene].choices.some(c=>c.id===choice))clean.flags[scene]=choice;
 if(Array.isArray(raw.history))clean.history=raw.history.filter(h=>h&&typeof h==='scene'&&SCENES[h.scene]&&typeof h.choice==='string').slice(0,20).map(h=>({scene:h.scene,choice:h.choice,die:Math.max(1,Math.min(20,Number(h.die)||1)),total:Number(h.total)||1,dc:Number(h.dc)||10,success:!!h.success}));
 return clean;
}
export function awardSkill(game,skill,xp=1){if(!SKILLS.includes(skill)||!game.dialogue)return;game.dialogue.skills[skill]=Math.min(30,(game.dialogue.skills[skill]||0)+xp);}
export function skillBonus(game,skill){const experience=Math.floor((game.dialogue?.skills?.[skill]||0)/4);
 const weapon=ITEMS[game.equipment?.weapon],armor=ITEMS[game.equipment?.armor];let gear=0;
 if(skill==='intimidation'&&weapon?.rarity==='Epic')gear=2;
 if(skill==='intimidation'&&weapon?.rarity==='Legendary')gear=3;
 if(skill==='survival'&&armor?.id==='traveler-cloak')gear=1;
 if(skill==='sleight'&&armor?.id==='patchwork-vest')gear=1;
 if(skill==='arcana'&&armor?.rarity==='Epic')gear=2;
 if(skill==='persuasion'&&(game.social?.affinity?.mira||0)>=50)gear=1;
 return Math.min(7,experience)+gear;
}
export function skillCheck(game,skill,dc,rng=Math.random){const die=Math.max(1,Math.min(20,Math.floor(rng()*20)+1)),bonus=skillBonus(game,skill),total=die+bonus;
 return {die,bonus,total,dc,success:die===20||(die!==1&&total>=dc)};
}
export function resolveDialogue(game,sceneId,choiceId,rng=Math.random){const scene=SCENES[sceneId],choice=scene?.choices.find(c=>c.id===choiceId);
 if(!choice)return {ok:false,message:'This conversation choice does not exist.'};
 if(game.dialogue.flags[sceneId])return {ok:false,message:'You already made your choice here. Your decision is permanent.'};
 const result=skillCheck(game,choice.skill,choice.dc,rng);
 game.dialogue.flags[sceneId]=choiceId;
 game.dialogue.history.unshift({scene:sceneId,choice:choiceId,die:result.die,total:result.total,dc:choice.dc,success:result.success});game.dialogue.history=game.dialogue.history.slice(0,20);
 awardSkill(game,choice.skill,2);
 if(result.success&&choice.reward){if(choice.reward.gold)game.player.gold+=choice.reward.gold;
   if(choice.reward.item)addItem(game.inventory,choice.reward.item,choice.reward.quantity||1);}
 return {ok:true,...result,choice,scene,description:result.success?choice.success:choice.failure,message:`${result.success?'SUCCESS':'FAILED'} · d20 ${result.die} + ${result.bonus} = ${result.total} vs DC ${choice.dc}. ${result.success?choice.success:choice.failure}`};
}
