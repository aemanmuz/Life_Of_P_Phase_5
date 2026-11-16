import {ITEMS} from '../data/items.js';

export const PLAYER_STATS=Object.freeze({maxHealth:100,maxMana:60,maxStamina:100,walkSpeed:145,sprintSpeed:210,rollSpeed:390,rollDuration:.34,rollStaminaCost:29,rollCooldown:.68});
export const ATTACKS=Object.freeze({
  light:{stamina:15,windup:.12,duration:.37,cooldown:.12,range:65,arc:.25,multiplier:1,posture:18},
  heavy:{stamina:34,windup:.35,duration:.79,cooldown:.16,range:85,arc:.05,multiplier:2.15,posture:45},
});
export function makePlayer(spawn){return {x:spawn.x,y:spawn.y,health:100,mana:60,stamina:100,gold:120,kills:0,facingX:0,facingY:1,moving:false,walkingTime:0,rolling:0,rollCooldown:0,rollX:0,rollY:1,invulnerable:false,invulnTimer:0,staminaDelay:0,attack:null,attackCooldown:0,parryTimer:0,parryCooldown:0,hitFlash:0,dead:false};}
export function startRoll(player,direction) {
  if(player.dead||player.attack||player.parryTimer>0||player.rolling>0||player.rollCooldown>0||player.stamina<PLAYER_STATS.rollStaminaCost)return false;
  player.rollX=direction.moving?direction.x:player.facingX;player.rollY=direction.moving?direction.y:player.facingY;
  player.stamina-=PLAYER_STATS.rollStaminaCost;player.rolling=PLAYER_STATS.rollDuration;player.rollCooldown=PLAYER_STATS.rollCooldown;
  player.invulnerable=true;player.staminaDelay=.55;return true;
}
export function startAttack(player,kind){
  const spec=ATTACKS[kind];if(!spec||player.dead||player.attack||player.attackCooldown>0||player.rolling>0||player.parryTimer>0||player.stamina<spec.stamina)return false;
  player.stamina-=spec.stamina;player.staminaDelay=.6;player.attack={kind,elapsed:0,hit:false};return true;
}
export function startParry(player){
  if(player.dead||player.attack||player.rolling>0||player.parryCooldown>0||player.parryTimer>0||player.stamina<17)return false;
  player.stamina-=17;player.staminaDelay=.5;player.parryTimer=.43;player.parryCooldown=.87;return true;
}
export function isParryActive(player){return player.parryTimer>.18;}
export function updateMovement(player,world,input,dt) {
  player.rollCooldown=Math.max(0,player.rollCooldown-dt);player.staminaDelay=Math.max(0,player.staminaDelay-dt);
  player.invulnTimer=Math.max(0,player.invulnTimer-dt);
  player.hitFlash=Math.max(0,player.hitFlash-dt);
  if(player.dead){player.moving=false;return;}
  const direction=input.direction();let vx=0,vy=0;
  if(player.rolling>0){
    player.rolling=Math.max(0,player.rolling-dt);
    const progress=player.rolling/PLAYER_STATS.rollDuration;
    const speed=PLAYER_STATS.rollSpeed*(.55+progress*.55);
    vx=player.rollX*speed;vy=player.rollY*speed;
  } else {
    const sprint=(input.down('ShiftLeft')||input.down('ShiftRight'))&&!(player.attack||player.parryTimer>0);
    const canSprint=sprint&&player.stamina>3&&direction.moving;
    const paceMultiplier=player.attack?.kind==='heavy'?0.3:(player.attack||player.parryTimer>0)?0.48:1;
    const speed=(canSprint?PLAYER_STATS.sprintSpeed:PLAYER_STATS.walkSpeed)*paceMultiplier;
    vx=direction.x*speed;vy=direction.y*speed;
    if(canSprint){player.stamina=Math.max(0,player.stamina-15*dt);player.staminaDelay=.18;}
    if(direction.moving){player.facingX=direction.x;player.facingY=direction.y;}
  }
  const dx=vx*dt,dy=vy*dt;
  if(!world.isBlocked(player.x+dx,player.y,10))player.x+=dx;
  if(!world.isBlocked(player.x,player.y+dy,10))player.y+=dy;
  player.moving=Math.abs(vx)+Math.abs(vy)>0;
  if(player.moving)player.walkingTime+=dt*(player.rolling?21:10);else player.walkingTime=0;
  if(player.staminaDelay<=0)player.stamina=Math.min(PLAYER_STATS.maxStamina,player.stamina+30*dt*(player.eventRegen||1));
  player.invulnerable=player.rolling>0||player.invulnTimer>0;
}
export function playerAttackPower(game){return (ITEMS[game.equipment.weapon]?.damage||9)+(game.story?.alignment==='villain'?5:0);}
export function playerDefense(game){return (ITEMS[game.equipment.armor]?.defense||0)+(game.story?.alignment==='hero'?3:0);}
export function applyPlayerDamage(game,amount,source){
  const p=game.player;
  if(p.dead||p.invulnerable)return {blocked:true};
  if(isParryActive(p)&&source){
    p.parryTimer=0;p.parryCooldown=.45;
    source.state='stagger';source.timer=source.captain&&source.weakness==='parry'?2.3:1.35;source.poise=0;
    source.hitFlash=.4;
    game.effect(source.x,source.y-27,'PARRY!','#aee8db');game.audio?.sound('parry');
    return {parried:true};
  }
  const damage=Math.max(1,Math.round(amount-playerDefense(game)*.7));
  p.health=Math.max(0,p.health-damage);p.hitFlash=.32;p.invulnTimer=.68;p.invulnerable=true;
  game.effect(p.x,p.y-39,`-${damage}`,'#ff998c');game.audio?.sound('hit');
  if(p.health<=0){p.dead=true;game.onPlayerDefeated(source);}
  return {damage};
}
/** Resolve a directional swing exactly once after its windup completes. */
export function updatePlayerCombat(game,dt){
  const p=game.player;
  p.attackCooldown=Math.max(0,p.attackCooldown-dt);
  p.parryCooldown=Math.max(0,p.parryCooldown-dt);
  p.parryTimer=Math.max(0,p.parryTimer-dt);
  if(!p.attack||p.dead)return;
  const attack=p.attack,spec=ATTACKS[attack.kind];attack.elapsed+=dt;
  if(!attack.hit&&attack.elapsed>=spec.windup){
    attack.hit=true;
    for(const enemy of game.enemies){
      if(!enemy.alive||enemy.recruited)continue;
      const dx=enemy.x-p.x,dy=enemy.y-p.y,range=Math.hypot(dx,dy);
      if(range>spec.range+enemy.radius||range<1)continue;
      const dot=(dx*p.facingX+dy*p.facingY)/range;
      if(dot<spec.arc)continue;
      const weakBonus=enemy.captain&&(enemy.weakness===attack.kind||enemy.weakness==='stagger'&&enemy.state==='stagger')?1.65:1;
      const armorBonus=enemy.captain&&enemy.trait==='ironhide'?.75:1;
      const resistBonus=enemy.captain&&enemy.resistance===attack.kind?.7:1;
      const damage=Math.max(1,Math.round(playerAttackPower(game)*spec.multiplier*weakBonus*armorBonus*resistBonus));
      enemy.health=Math.max(0,enemy.health-damage);enemy.poise+=spec.posture;
      enemy.hitFlash=.23;game.effect(enemy.x,enemy.y-28,`-${damage}`,attack.kind==='heavy'?'#ffd08a':'#ffe4bb');
      if(enemy.health<=0){enemy.alive=false;enemy.state='dead';enemy.respawnTimer=enemy.elite?0:45;game.onEnemyKilled(enemy);continue;}
      if(enemy.poise>=enemy.maxPosture){enemy.state='stagger';enemy.timer=attack.kind==='heavy'?1.35:.85;enemy.poise=0;game.effect(enemy.x,enemy.y-48,'STAGGER','#c6e8f4');}
      else if(enemy.state==='windup'&&attack.kind==='heavy'){enemy.state='stagger';enemy.timer=.5;}
    }
  }
  if(attack.elapsed>=spec.duration){p.attack=null;p.attackCooldown=spec.cooldown;}
}
