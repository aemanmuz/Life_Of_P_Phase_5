/** Deterministic daily changes; a loaded save sees the same event for that day. */
export const EVENTS=Object.freeze([
  {id:'calm',name:'Quiet Skies',icon:'✦',description:'The valley takes a breath between disasters.',enemyDamage:1,staminaRegen:1,color:'#c4d4b7'},
  {id:'ashfall',name:'Ashfall',icon:'☄',description:'Ash from the northern rift fills the air. Your stamina regenerates more slowly.',enemyDamage:1,staminaRegen:.75,color:'#efc196'},
  {id:'eclipse',name:'Eclipse of Ruin',icon:'◉',description:'A cursed eclipse strengthens hostile enemies. Be careful.',enemyDamage:1.2,staminaRegen:1,color:'#e09ea5'},
  {id:'bloom',name:'Verdant Bloom',icon:'❀',description:'The valley stirs with renewed life; stamina returns faster.',enemyDamage:1,staminaRegen:1.3,color:'#a3d8a6'},
]);
export function eventForDay(day){
  const index=((Math.max(1,Math.floor(day))-1)%8);
  return EVENTS[[0,3,0,1,2,0,3,1][index]];
}
