import {removeItem} from '../data/items.js';
export function makeSocial(){return {affinity:{mira:0,rowan:0},activeName:'Wanderer',talkedOn:{},giftedOn:{},marriedTo:null,marriedDay:null,child:null,generation:1,ancestors:[]};}
export function loadSocial(raw){
  const safe=makeSocial();if(!raw||typeof raw!=='object')return safe;
  for(const id of ['mira','rowan']){
    safe.affinity[id]=Number.isFinite(raw.affinity?.[id])?Math.min(100,Math.max(0,Math.floor(raw.affinity[id]))):0;
    for(const key of ['talkedOn','giftedOn'])if(Number.isInteger(raw[key]?.[id])&&raw[key][id]>0)safe[key][id]=raw[key][id];
  }
  if(['Eira','Ari'].includes(raw.activeName))safe.activeName=raw.activeName;
  if(['mira','rowan'].includes(raw.marriedTo)){safe.marriedTo=raw.marriedTo;safe.marriedDay=Number.isInteger(raw.marriedDay)?Math.max(1,raw.marriedDay):1;}
  if(safe.marriedTo&&raw.child&&typeof raw.child==='object'&&Number.isInteger(raw.child.bornDay)&&raw.child.bornDay>0){safe.child={name:raw.child.name==='Ari'?'Ari':'Eira',bornDay:raw.child.bornDay};}
  safe.generation=Number.isInteger(raw.generation)?Math.min(99,Math.max(1,raw.generation)):1;
  safe.ancestors=Array.isArray(raw.ancestors)?raw.ancestors.filter(a=>a&&typeof a==='string').slice(-30).map(a=>a.slice(0,60)):[];
  return safe;
}
export function talkTo(game,npcId){
  if(!Object.hasOwn(game.social.affinity,npcId))return {ok:false,message:'This person is not available.'};
  if(game.social.talkedOn[npcId]===game.clock.day)return {ok:false,message:'You have already spoken today. Come back tomorrow.'};
  game.social.talkedOn[npcId]=game.clock.day;
  game.social.affinity[npcId]=Math.min(100,game.social.affinity[npcId]+10);
  return {ok:true,message:`Friendship +10 with ${npcId==='mira'?'Mira':'Rowan'}.`};
}
export function giftTo(game,npcId,itemId){
  if(!Object.hasOwn(game.social.affinity,npcId))return {ok:false,message:'This person is not available.'};
  if(game.social.giftedOn[npcId]===game.clock.day)return {ok:false,message:'One gift per person each day.'};
  if(!['turnip','wheat','pumpkin','frostroot','herb'].includes(itemId))return {ok:false,message:'Only crops and herbs make suitable gifts.'};
  if(!removeItem(game.inventory,itemId))return {ok:false,message:'You do not have this gift.'};
  game.social.giftedOn[npcId]=game.clock.day;
  const gain=(npcId==='mira'&&itemId==='turnip')||(npcId==='rowan'&&itemId==='herb')?22:14;
  game.social.affinity[npcId]=Math.min(100,game.social.affinity[npcId]+gain);
  return {ok:true,message:`Gift received! Friendship +${gain}.`};
}
export function marry(game,npcId){
  if(game.social.marriedTo)return {ok:false,message:'You are already married.'};
  if(!game.homeOwned)return {ok:false,message:'First claim the cottage beside the crossroads.'};
  if((game.social.affinity[npcId]||0)<70)return {ok:false,message:'Build a bond of at least 70 before proposing.'};
  game.social.marriedTo=npcId;game.social.marriedDay=game.clock.day;
  return {ok:true,message:`You and ${npcId==='mira'?'Mira':'Rowan'} are married! Return home to plan your family.`};
}
export function startFamily(game,name){
  if(!game.social.marriedTo)return {ok:false,message:'Marry someone before starting a family.'};
  if(game.social.child)return {ok:false,message:'Your family already has an heir.'};
  if(game.clock.day-game.social.marriedDay<2)return {ok:false,message:'Spend two days together after your wedding.'};
  if(!['Eira','Ari'].includes(name))return {ok:false,message:'Choose a name for your heir.'};
  game.social.child={name,bornDay:game.clock.day};
  return {ok:true,message:`${name} joins your family! Your heir grows up over seven days.`};
}
export function heirReady(social,day){return Boolean(social.child&&day-social.child.bornDay>=7);}
export function retireToHeir(game){
  if(!heirReady(game.social,game.clock.day))return {ok:false,message:'Your heir has not yet reached adulthood.'};
  const name=game.social.child.name;
  game.social.activeName=name;
  game.social.ancestors.push(`Generation ${game.social.generation} · The Unwritten Soul`);
  game.social.ancestors=game.social.ancestors.slice(-30);
  game.social.generation++;
  game.social.marriedTo=null;game.social.marriedDay=null;game.social.child=null;
  game.social.affinity={mira:0,rowan:0};game.social.talkedOn={};game.social.giftedOn={};
  return {ok:true,message:`Generation ${game.social.generation}: ${name} inherits the estate, gear, gold and farmland.`};
}
