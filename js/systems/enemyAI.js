import {ENEMY_ARCHETYPES,ENEMY_SPAWNS} from '../data/enemies.js';
import {applyPlayerDamage} from './combat.js';
import {TILE} from '../engine/world.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function makeEnemies(world){
  return ENEMY_SPAWNS.map((spawn,index)=>{
    const spec=ENEMY_ARCHETYPES[spawn.kind];let x=(spawn.tx+.5)*TILE,y=(spawn.ty+.5)*TILE;
    if(world.isBlocked(x,y,16)){
      let found=false;
      for(let r=1;r<=6&&!found;r++)for(let angle=0;angle<12;angle++){
        const nx=x+Math.cos(angle*Math.PI/6)*r*TILE,ny=y+Math.sin(angle*Math.PI/6)*r*TILE;
        if(!world.isBlocked(nx,ny,16)){x=nx;y=ny;found=true;break;}
      }
    }
    return {id:`foe-${index}`,kind:spawn.kind,name:spec.name,x,y,homeX:x,homeY:y,
      maxHealth:spec.maxHealth,health:spec.maxHealth,maxPosture:spec.posture,poise:0,damage:spec.damage,
      speed:spec.speed,reach:spec.reach,windup:spec.windup,attackCooldown:spec.attackCooldown,aggro:spec.aggro,
      radius:spec.elite?20:13,elite:!!spec.elite,color:spec.color,state:'idle',timer:0,
      attackWait:0,hitFlash:0,facingX:0,facingY:1,alive:true,respawnTimer:0};
  });
}
function moveToward(enemy,tx,ty,world,dt,speed){
  const dx=tx-enemy.x,dy=ty-enemy.y,d=Math.hypot(dx,dy)||1;
  enemy.facingX=dx/d;enemy.facingY=dy/d;
  const nx=enemy.x+enemy.facingX*speed*dt,ny=enemy.y+enemy.facingY*speed*dt;
  if(!world.isBlocked(nx,enemy.y,enemy.radius))enemy.x=nx;
  if(!world.isBlocked(enemy.x,ny,enemy.radius))enemy.y=ny;
}
export function updateEnemies(game,dt){
  const p=game.player;
  for(const e of game.enemies){
    if(e.recruited)continue;
    e.hitFlash=Math.max(0,e.hitFlash-dt);
    if(!e.alive){
      if(e.elite||e.captain||p.dead)continue;
      e.respawnTimer=Math.max(0,e.respawnTimer-dt);
      if(e.respawnTimer<=0&&dist(e,p)>260){
        e.x=e.homeX;e.y=e.homeY;e.health=e.maxHealth;e.poise=0;e.alive=true;e.state='idle';e.attackWait=1;
      }
      continue;
    }
    if(p.dead){e.state='idle';continue;}
    e.attackWait=Math.max(0,e.attackWait-dt);
    if(e.elite&&e.kind!=='ash-warden'&&!e.enraged&&e.health<=e.maxHealth*(e.kind==='cinder-regent'?.65:.5)){
      e.enraged=true;e.damage=Math.ceil(e.damage*1.22);e.speed*=1.15;e.windup*=.83;
      game.effect(e.x,e.y-65,'ENRAGED!','#f3b684');game.audio?.sound('heavy');
    }
    const d=dist(e,p),homeDist=Math.hypot(e.x-e.homeX,e.y-e.homeY);
    if(e.state==='stagger'){e.timer-=dt;if(e.timer<=0){e.state='chase';e.attackWait=.5;}continue;}
    if(e.state==='windup'){
      e.timer-=dt;
      if(e.timer<=0){
        e.state='recover';e.timer=.48;e.attackWait=e.attackCooldown;
        if(d<=e.reach+18){
          const toward=(p.x-e.x)*e.facingX+(p.y-e.y)*e.facingY;
          if(toward>=-6)applyPlayerDamage(game,Math.ceil(e.damage*(game.worldEvent?.enemyDamage||1)),e);
        }
      }
      continue;
    }
    if(e.state==='recover'){e.timer-=dt;if(e.timer<=0)e.state='chase';continue;}
    if(d>e.aggro*1.75||homeDist>e.aggro*2.35){
      e.state='return';if(homeDist>12)moveToward(e,e.homeX,e.homeY,game.world,dt,e.speed*.82);
      else e.state='idle';continue;
    }
    if(d<e.aggro||e.state==='chase'){
      e.state='chase';
      const dx=p.x-e.x,dy=p.y-e.y,len=Math.hypot(dx,dy)||1;
      e.facingX=dx/len;e.facingY=dy/len;
      if(d<=e.reach+8&&e.attackWait<=0){e.state='windup';e.timer=e.windup;continue;}
      if(d>e.reach*.75)moveToward(e,p.x,p.y,game.world,dt,e.speed);
    } else {
      e.state='idle';
      // A small static idle animation. Patrol routes can arrive in later phases.
    }
  }
}
