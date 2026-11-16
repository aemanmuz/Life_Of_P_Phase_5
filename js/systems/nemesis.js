/** Phase 4: persistent procedural rival captains, memory, scars and ally recruitment. */
import {ENEMY_ARCHETYPES} from '../data/enemies.js';
export const CAPTAIN_SLOTS=[0,2,4,6];
const FIRST=['Vargan','Morvek','Kaldra','Tharos','Velka','Dren','Iskra','Rhovan'];
const TITLES=['the Ashfang','the Hollow','the Unbroken','the Whispering','the Riftblade','the Relentless','the Scarred','the Cold'];
const TRAITS=['brutal','swift','ironhide','relentless'];
const WEAKNESSES=['parry','heavy','light','stagger'];
const capClamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const note=(board,message)=>{board.events.unshift(message);board.events=board.events.slice(0,25);};
export function makeNemesis(rng=Math.random){
  const offset=Math.floor(rng()*FIRST.length);
  return {captains:CAPTAIN_SLOTS.map((slot,i)=>({
    id:`foe-${slot}`,name:`${FIRST[(i*3+offset)%FIRST.length]} ${TITLES[Math.floor(rng()*TITLES.length)]}`,
    rank:1,victories:0,defeats:0,scars:0,trait:TRAITS[Math.floor(rng()*TRAITS.length)],
    weakness:WEAKNESSES[Math.floor(rng()*WEAKNESSES.length)],
    resistance:['light','heavy','none'][Math.floor(rng()*3)],status:'active',returnDay:0
  })),events:['The captains of the Ashen Verge have begun to rise.']};
}
export function loadNemesis(raw){const clean=makeNemesis(()=>0);if(!raw||typeof raw!=='object')return clean;
  for(const cap of clean.captains){const saved=(Array.isArray(raw.captains)?raw.captains:[]).find(c=>c?.id===cap.id);if(!saved)continue;
    if(typeof saved.name==='string'&&saved.name.length<=90&&/^[\w\s’'-]+$/.test(saved.name))cap.name=saved.name;
    if(TRAITS.includes(saved.trait))cap.trait=saved.trait;
    if(WEAKNESSES.includes(saved.weakness))cap.weakness=saved.weakness;
    if(['light','heavy','none'].includes(saved.resistance))cap.resistance=saved.resistance;
    cap.rank=Number.isInteger(saved.rank)?capClamp(saved.rank,1,5):1;
    for(const k of ['victories','defeats','scars','returnDay'])cap[k]=Number.isInteger(saved[k])?capClamp(saved[k],0,k==='returnDay'?100000:999):0;
    cap.status=['active','fallen','vanquished','recruited'].includes(saved.status)?saved.status:'active';
    if(cap.status==='fallen'&&cap.scars>=2&&cap.returnDay===0)cap.status='vanquished';
  }
  if(Array.isArray(raw.events))clean.events=raw.events.filter(e=>typeof e==='string').slice(0,25).map(e=>e.slice(0,180));return clean;
}
export function captainFor(game,id){return game.nemesis?.captains.find(c=>c.id===id)||null;}
export function syncNemesis(game){for(const captain of game.nemesis.captains){const e=game.enemies.find(enemy=>enemy.id===captain.id);if(!e)continue;
    const base=ENEMY_ARCHETYPES[e.kind];const healthRatio=e.maxHealth?e.health/e.maxHealth:1;e.captain=true;e.name=captain.name;e.rank=captain.rank;e.trait=captain.trait;e.weakness=captain.weakness;e.resistance=captain.resistance;e.recruited=captain.status==='recruited';
    e.maxHealth=Math.round(base.maxHealth*(1.35+(captain.rank-1)*.19));e.maxPosture=Math.round(base.posture*1.2);
    e.damage=Math.round(base.damage*(captain.trait==='brutal'?1.3:1)*(1+(captain.rank-1)*.12));
    e.speed=base.speed*(captain.trait==='swift'?1.28:1);e.windup=base.windup*(captain.trait==='relentless'?.78:1);
    e.health=capClamp(Math.round(healthRatio*e.maxHealth),0,e.maxHealth);
    if(captain.status==='vanquished'||captain.status==='fallen'){e.alive=false;e.state='dead';e.respawnTimer=0;}
    if(captain.status==='recruited'){e.alive=true;e.state='ally';e.health=Math.max(e.health,e.maxHealth*.6);}
  }}
export function onCaptainKilled(game,enemy){const c=captainFor(game,enemy.id);if(!c||c.status!=='active')return;
  c.defeats++;if(c.scars<2){c.scars++;c.status='fallen';c.returnDay=game.clock.day+2+c.scars;
    note(game.nemesis,`${c.name} fell, but will return scarred on day ${c.returnDay}.`);
  }else{c.status='vanquished';c.returnDay=0;note(game.nemesis,`${c.name} has been permanently defeated.`);}
}
export function onCaptainVictory(game,killer){const c=killer?captainFor(game,killer.id):null;if(!c||c.status!=='active')return null;
  c.rank=capClamp(c.rank+1,1,5);c.victories++;note(game.nemesis,`${c.name} defeated you and rose to rank ${c.rank}.`);
  syncNemesis(game);return c;
}
export function advanceNemesisDay(game){let count=0;for(const c of game.nemesis.captains){if(c.status!=='fallen'||game.clock.day<c.returnDay)continue;
  c.status='active';c.returnDay=0;const e=game.enemies.find(e=>e.id===c.id);if(e){e.health=ENEMY_ARCHETYPES[e.kind].maxHealth;e.x=e.homeX;e.y=e.homeY;e.alive=true;e.state='idle';e.poise=0;e.attackWait=2;}
  note(game.nemesis,`${c.name} returns with ${c.scars} battle scar${c.scars===1?'':'s'}.`);count++;
}if(count)syncNemesis(game);return count;}
export function canDominate(game,enemy){const c=enemy&&captainFor(game,enemy.id);
  return Boolean(c&&c.status==='active'&&enemy.alive&&!game.player.dead&&Math.hypot(enemy.x-game.player.x,enemy.y-game.player.y)<=78&&(enemy.health/enemy.maxHealth<=.32||enemy.state==='stagger'));
}
export function nearestDomination(game){return game.enemies.filter(e=>canDominate(game,e)).sort((a,b)=>Math.hypot(a.x-game.player.x,a.y-game.player.y)-Math.hypot(b.x-game.player.x,b.y-game.player.y))[0]||null;}
export function dominateCaptain(game,id,rollCheck){const e=game.enemies.find(e=>e.id===id);const c=captainFor(game,id);
  if(!canDominate(game,e))return {ok:false,message:'Weaken and approach this captain before attempting to dominate them.'};
  const dc=11+c.rank+Math.min(2,c.victories);const result=rollCheck('intimidation',dc);
  if(result.success){c.status='recruited';e.recruited=true;e.state='ally';e.health=e.maxHealth;e.poise=0;e.attackWait=1.5;
    note(game.nemesis,`${c.name} was dominated and now fights at your side.`);
    return {ok:true,success:true,roll:result,dc,message:`${c.name} has pledged allegiance (d20 ${result.die}+${result.bonus} against DC ${dc}).`};
  }
  e.state='chase';e.attackWait=.4;e.health=Math.max(e.health,Math.ceil(e.maxHealth*.42));e.poise=0;
  note(game.nemesis,`${c.name} resisted domination (${result.total} against DC ${dc}).`);
  return {ok:true,success:false,roll:result,dc,message:`${c.name} resisted! Rolled ${result.total} vs DC ${dc}. The captain recovered some health.`};
}
/** Recruited captains follow the player and strike hostile enemies, never the player. */
export function updateRecruits(game,dt){for(const ally of game.enemies.filter(e=>e.recruited&&e.alive)){
  ally.attackWait=Math.max(0,ally.attackWait-dt);const p=game.player;let target=null,best=185;
  for(const foe of game.enemies){if(!foe.alive||foe.recruited||foe===ally)continue;
    const d=Math.hypot(foe.x-ally.x,foe.y-ally.y);if(d<best){best=d;target=foe;}
  }
  const follow=target||p,dx=follow.x-ally.x,dy=follow.y-ally.y,d=Math.hypot(dx,dy)||1;
  const maxD=target?ally.reach*.8:85;
  if(d>maxD){const speed=ally.speed*(target?1:1.3),nx=ally.x+dx/d*speed*dt,ny=ally.y+dy/d*speed*dt;
    if(!game.world.isBlocked(nx,ally.y,ally.radius))ally.x=nx;if(!game.world.isBlocked(ally.x,ny,ally.radius))ally.y=ny;
  }
  ally.facingX=dx/d;ally.facingY=dy/d;
  if(!target&&Math.hypot(ally.x-p.x,ally.y-p.y)>550){const offset=45;const nx=p.x+offset,ny=p.y+offset;if(!game.world.isBlocked(nx,ny,ally.radius)){ally.x=nx;ally.y=ny;}}
  if(target&&d<ally.reach+10&&ally.attackWait<=0){ally.attackWait=1.4;target.health=Math.max(0,target.health-Math.round(ally.damage*.75));target.hitFlash=.22;
    game.effect(target.x,target.y-26,'ALLY STRIKE','#85e4d1');if(!target.health){target.alive=false;target.state='dead';target.respawnTimer=target.elite?0:45;game.onEnemyKilled(target);}
  }
}}
