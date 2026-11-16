/** Phase 5 save; unchanged storage key preserves progress from Phases 1–4. */
const SAVE_KEY='life-of-p-phase1-v1';
export function hasSave(){try{return Boolean(localStorage.getItem(SAVE_KEY));}catch{return false;}}
export function saveGame(game){
  const p=game.player;
  const data={version:5,player:{x:p.x,y:p.y,health:p.health,mana:p.mana,stamina:p.stamina,gold:p.gold,kills:p.kills},
    clock:game.clock.minutes,day:game.clock.day,questStep:game.questStep,
    farm:game.farm||[],social:game.social||null,nemesis:game.nemesis||null,dialogue:game.dialogue||null,story:game.story||null,homeOwned:Boolean(game.homeOwned),herbGatherDay:game.herbGatherDay||0,
    inventory:game.inventory,equipment:game.equipment,dropCounter:game.dropCounter,drops:game.drops,
    enemies:game.enemies?.map(e=>({id:e.id,x:e.x,y:e.y,health:e.health,alive:e.alive,respawnTimer:e.respawnTimer}))||[],
    savedAt:new Date().toISOString()};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));return true;}catch{return false;}
}
export function loadGame(){
  try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const data=JSON.parse(raw);
    if(![1,2,3,4,5].includes(data.version)||!Number.isFinite(data.player?.x)||!Number.isFinite(data.player?.y)||!Number.isFinite(data.clock)||!Number.isFinite(data.questStep))return null;
    return data;
  }catch{return null;}
}

/** Portable backup to move saves between browser profiles or GitHub Pages domains. */
export function exportSave(){try{return localStorage.getItem(SAVE_KEY);}catch{return null;}}
export function importSave(source){
  try{
    if(typeof source!=='string'||source.length>500000)return {ok:false,message:'Save file is invalid or too large.'};
    const data=JSON.parse(source);
    if(![1,2,3,4,5].includes(data.version)||!Number.isFinite(data.player?.x)||!Number.isFinite(data.player?.y)||!Number.isFinite(data.clock)||!Number.isFinite(data.questStep))return {ok:false,message:'This is not a compatible Life of P save.'};
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));return {ok:true,message:'Imported'};
  }catch{return {ok:false,message:'Import failed; verify that the file contains valid JSON and storage is enabled.'};}
}
