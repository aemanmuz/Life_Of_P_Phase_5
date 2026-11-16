import {TILE,TERRAIN} from './world.js';
import {QUEST_STEPS} from '../data/quests.js';
import {storyObjective} from '../systems/story.js';

const COLORS=['#496c4c','#436348','#ae956b','#36707c','#baab7d','#796740','#87867a','#628456'];
const rnd=(x,y,s=0)=>{let n=Math.imul(x+3,73856093)^Math.imul(y+7,19349663)^Math.imul(s+1,83492791);return (Math.imul(n^(n>>>11),2654435761)>>>0)/4294967296;};
const rgba=(r,g,b,a)=>`rgba(${r},${g},${b},${a})`;

export class CanvasEngine {
  constructor(canvas,world){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.world=world;this.width=window.innerWidth;this.height=window.innerHeight;
    this.camera={x:0,y:0};this.initialCamera=true;this.frame=0;
    this.mapCache=this.createMap();
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  resize(){const rect=this.canvas.getBoundingClientRect();this.width=rect.width;this.height=rect.height;this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.floor(this.width*this.dpr);this.canvas.height=Math.floor(this.height*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.initialCamera=true;}
  updateCamera(player,dt){
    const tx=Math.max(0,Math.min(this.world.pixelWidth-this.width,player.x-this.width/2));
    const ty=Math.max(0,Math.min(this.world.pixelHeight-this.height,player.y-this.height/2));
    // Large viewports may exceed world size; center in that case.
    const x=this.world.pixelWidth>this.width?tx:(this.world.pixelWidth-this.width)/2;
    const y=this.world.pixelHeight>this.height?ty:(this.world.pixelHeight-this.height)/2;
    if(this.initialCamera){this.camera.x=x;this.camera.y=y;this.initialCamera=false;}
    const blend=Math.min(1,dt*5.1);
    this.camera.x+=(x-this.camera.x)*blend;
    this.camera.y+=(y-this.camera.y)*blend;
  }
  draw(game,dt){
    this.updateCamera(game.player,dt);this.frame+=dt;
    const c=this.ctx,w=this.width,h=this.height;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);
    c.fillStyle='#32483c';c.fillRect(0,0,w,h);
    c.save();c.translate(-this.camera.x,-this.camera.y);
    const startX=Math.max(0,Math.floor(this.camera.x/TILE)-1),endX=Math.min(this.world.width,Math.ceil((this.camera.x+w)/TILE)+1);
    const startY=Math.max(0,Math.floor(this.camera.y/TILE)-1),endY=Math.min(this.world.height,Math.ceil((this.camera.y+h)/TILE)+1);
    for(let y=startY;y<endY;y++) for(let x=startX;x<endX;x++) this.drawTile(x,y,this.world.tiles[y][x]);
    this.drawRoadDetails(startX,endX,startY,endY);
    this.drawFarm(game,startX,endX,startY,endY);
    const actors=[];
    for(const obj of this.world.objects){const ox=obj.x,oy=obj.y; if(ox<this.camera.x-100||oy<this.camera.y-130||ox>this.camera.x+w+130||oy>this.camera.y+h+130)continue;actors.push({z:obj.w?obj.y+obj.h:obj.y,draw:()=>this.drawObject(obj)});}
    for(const mark of this.world.landmarks){if(mark.x<this.camera.x-100||mark.y<this.camera.y-100||mark.x>this.camera.x+w+100||mark.y>this.camera.y+h+100)continue;actors.push({z:mark.y,draw:()=>this.drawLandmark(mark,game)});}
    for(const npc of game.npcs||[]){
      if(npc.x<this.camera.x-100||npc.y<this.camera.y-110||npc.x>this.camera.x+w+100||npc.y>this.camera.y+h+100)continue;
      actors.push({z:npc.y+5,draw:()=>this.drawVillager(npc)});
    }
    for(const drop of game.drops||[]){
      if(drop.x<this.camera.x-80||drop.y<this.camera.y-80||drop.x>this.camera.x+w+80||drop.y>this.camera.y+h+80)continue;
      actors.push({z:drop.y,draw:()=>this.drawDrop(drop)});
    }
    for(const enemy of game.enemies||[]){
      if(!enemy.alive||enemy.x<this.camera.x-110||enemy.y<this.camera.y-110||enemy.x>this.camera.x+w+110||enemy.y>this.camera.y+h+110)continue;
      actors.push({z:enemy.y+6,draw:()=>this.drawEnemy(enemy)});
    }
    actors.push({z:game.player.y+7,draw:()=>this.drawPlayer(game.player)});
    actors.sort((a,b)=>a.z-b.z);
    for(const actor of actors)actor.draw();
    this.drawBeacons(game);
    this.drawCombatEffects(game);
    c.restore();
    this.drawLighting(game);
    this.drawAtmosphere(game);
  }
  drawTile(x,y,type){
    const c=this.ctx,px=x*TILE,py=y*TILE;
    c.fillStyle=COLORS[type];c.fillRect(px,py,TILE+1,TILE+1);
    const n=rnd(x,y);
    if(type===TERRAIN.MEADOW||type===TERRAIN.GRASS||type===TERRAIN.FLOWERS){
      c.strokeStyle=type===TERRAIN.GRASS?'#739264a8':'#698f61a0';c.lineWidth=1;
      for(let i=0;i<3;i++){const a=rnd(x,y,i+40)*26+3,b=rnd(x,y,i+70)*24+5;c.beginPath();c.moveTo(px+a,py+b+3);c.lineTo(px+a-2,py+b-1);c.moveTo(px+a,py+b+3);c.lineTo(px+a+2,py+b);c.stroke();}
      if(type===TERRAIN.FLOWERS){c.fillStyle=n>.45?'#dac18b':'#d5a4a0';c.fillRect(px+10,py+9,3,3);c.fillRect(px+22,py+23,2,2);}
    } else if(type===TERRAIN.PATH){
      c.fillStyle='#e3c99c18';c.fillRect(px,py,32,32);
      c.strokeStyle='#675c4b4a';c.lineWidth=.8;c.beginPath();
      c.moveTo(px+2+n*13,py+8);c.lineTo(px+9+n*13,py+9);c.moveTo(px+19,py+26);c.lineTo(px+27,py+27);c.stroke();
    } else if(type===TERRAIN.WATER){
      c.fillStyle='#578e98';c.fillRect(px,py,32,32);
      const wave=(this.frame*13+Math.floor(n*28))%35;
      c.strokeStyle='#b3d2c14d';c.lineWidth=1.2;c.beginPath();c.moveTo(px+2+wave*.35,py+10);c.lineTo(px+13+wave*.35,py+10);c.moveTo(px+6,py+23);c.lineTo(px+18,py+23);c.stroke();
    } else if(type===TERRAIN.SHORE){
      c.fillStyle='#d9c99e55';c.fillRect(px+n*7,py+5,22,3);
    } else if(type===TERRAIN.FIELD){
      c.strokeStyle='#4d482dc2';c.lineWidth=2;c.beginPath();c.moveTo(px+8,py);c.lineTo(px+8,py+32);c.moveTo(px+23,py);c.lineTo(px+23,py+32);c.stroke();
      c.fillStyle='#8fa65a';for(let i=0;i<3;i++)c.fillRect(px+13,py+5+i*10,3,5);
    } else if(type===TERRAIN.STONE){
      c.strokeStyle='#d6c8a431';c.lineWidth=.7;c.strokeRect(px+2,py+2,28,28);if(n>.6){c.beginPath();c.moveTo(px+16,py+5);c.lineTo(px+11,py+16);c.lineTo(px+18,py+27);c.stroke();}
    }
  }
  drawFarm(game,x0,x1,y0,y1){
    const c=this.ctx;
    for(const plot of game.farm||[]){
      if(plot.x<x0||plot.x>x1||plot.y<y0||plot.y>y1)continue;
      const x=plot.x*TILE,y=plot.y*TILE;
      if(plot.tilled){
        c.fillStyle=plot.watered?'#4f4539':'#62503a';c.fillRect(x+2,y+2,28,28);
        c.strokeStyle=plot.watered?'#81988a':'#9e8257';c.lineWidth=1;c.strokeRect(x+2.5,y+2.5,27,27);
        c.strokeStyle='#9e805759';c.beginPath();c.moveTo(x+8,y+6);c.lineTo(x+8,y+28);c.moveTo(x+21,y+6);c.lineTo(x+21,y+28);c.stroke();
      }
      if(plot.cropId){
        const colors={turnip:'#dab2cb',wheat:'#e8c66b',pumpkin:'#dd8847',frostroot:'#a3cce4'};
        const max={turnip:2,wheat:3,pumpkin:4,frostroot:3}[plot.cropId];
        const stage=plot.growth/max;
        for(let i=0;i<3;i++){
          const cx=x+8+i*8,cy=y+15+(i%2)*3;
          c.strokeStyle='#93b36d';c.lineWidth=2;c.beginPath();c.moveTo(cx,cy+7);c.lineTo(cx,cy-3-stage*5);c.stroke();
          c.fillStyle=stage>=1?colors[plot.cropId]:'#84ad66';
          c.beginPath();c.ellipse(cx-3,cy-3-stage*5,3+stage*2,2+stage*2,-.5,0,7);c.fill();
          c.beginPath();c.ellipse(cx+3,cy-5-stage*4,3+stage*2,2+stage*2,.5,0,7);c.fill();
        }
        if(stage>=1){c.fillStyle='#f2d99a';c.font='bold 12px system-ui';c.textAlign='center';c.fillText('✦',x+16,y+7);}
      }
    }
  }
  drawVillager(npc){
    const c=this.ctx,x=npc.x,y=npc.y,bob=Math.sin(this.frame*2.2+npc.x*.01)*1.2;
    c.save();c.translate(x,y+bob);
    c.fillStyle='#08181291';c.beginPath();c.ellipse(2,13,12,5,0,0,7);c.fill();
    c.fillStyle='#7e6655';c.fillRect(-7,2,5,13);c.fillRect(3,2,5,13);
    c.fillStyle=npc.color;c.beginPath();c.moveTo(-11,-14);c.lineTo(11,-14);c.lineTo(13,10);c.lineTo(-12,10);c.closePath();c.fill();
    c.fillStyle=npc.id==='rowan'?'#d8a983':'#cda883';c.beginPath();c.arc(0,-18,8,0,7);c.fill();
    c.fillStyle=npc.id==='mira'?'#483729':'#474b49';c.beginPath();c.arc(0,-23,9,Math.PI,7);c.fill();
    if(npc.shop){c.fillStyle='#dbc081';c.fillRect(-12,-18,24,4);c.fillRect(-7,-29,14,12);}
    c.textAlign='center';c.font='bold 10px system-ui';c.fillStyle='#f8dfac';c.shadowColor='#081510';c.shadowBlur=7;c.fillText(npc.name.toUpperCase(),0,-38);c.shadowBlur=0;
    c.restore();
  }
  drawRoadDetails(x0,x1,y0,y1){
    const c=this.ctx;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      if(this.world.tiles[y][x]!==TERRAIN.PATH || rnd(x,y,123)>.075)continue;
      c.fillStyle='#d8c38a45';c.beginPath();c.ellipse(x*TILE+16,y*TILE+16,9,4,.25,0,Math.PI*2);c.fill();
    }
  }
  drawObject(obj){
    const c=this.ctx,x=obj.x,y=obj.y;
    if(obj.kind==='tree'){
      const alt=obj.variant>.65;
      c.fillStyle='#0a1a1766';c.beginPath();c.ellipse(x+4,y+11,23,9,-.2,0,7);c.fill();
      c.fillStyle='#544632';c.fillRect(x-4,y-17,8,26);
      for(const [dx,dy,rx,ry,col] of [[-11,-22,19,18,alt?'#35594a':'#254a3b'],[12,-20,19,18,alt?'#42694a':'#2e563c'],[-1,-35,23,21,alt?'#587748':'#3d6744']]){
        c.fillStyle=col;c.beginPath();c.ellipse(x+dx,y+dy,rx,ry,0,0,7);c.fill();
      }
      c.fillStyle='#a6bb7444';c.beginPath();c.ellipse(x-10,y-40,11,4,-.3,0,7);c.fill();
    } else if(obj.kind==='rock'||obj.kind==='broken-pillar'){
      c.fillStyle='#06131073';c.beginPath();c.ellipse(x+4,y+9,18,7,0,0,7);c.fill();
      c.fillStyle=obj.kind==='rock'?'#888d7c':'#a3a08c';c.beginPath();c.moveTo(x-14,y+5);c.lineTo(x-10,y-9);c.lineTo(x+5,y-16);c.lineTo(x+16,y-7);c.lineTo(x+12,y+7);c.closePath();c.fill();
      c.strokeStyle='#dee1ba5a';c.beginPath();c.moveTo(x-10,y-8);c.lineTo(x+3,y-11);c.lineTo(x+12,y-5);c.stroke();
      if(obj.kind==='broken-pillar'){c.fillStyle='#666d61';c.fillRect(x-9,y-28,19,20);c.fillStyle='#b2af9a';c.fillRect(x-12,y-33,24,7);c.fillStyle='#cbc2a84d';c.fillRect(x-7,y-29,4,13);}
    } else if(obj.kind==='bush'){
      c.fillStyle='#264b38';c.beginPath();c.ellipse(x,y,16,9,0,0,7);c.fill();c.fillStyle='#517b48';for(let i=0;i<4;i++){c.beginPath();c.arc(x-11+i*7,y-4-rnd(i,Math.floor(y),3)*7,7,0,7);c.fill();}
    } else if(obj.kind==='well'){
      c.fillStyle='#0b1a1aa0';c.beginPath();c.ellipse(x+3,y+13,24,12,0,0,7);c.fill();
      c.fillStyle='#9b9887';c.beginPath();c.ellipse(x,y,20,15,0,0,7);c.fill();c.fillStyle='#244954';c.beginPath();c.ellipse(x,y,12,9,0,0,7);c.fill();
      c.strokeStyle='#d4ccb1';c.lineWidth=2;c.beginPath();c.ellipse(x,y,20,15,0,0,7);c.stroke();
    } else if(obj.kind==='house')this.drawHouse(obj);
  }
  drawHouse(obj){
    const c=this.ctx,{x,y,w,h}=obj,roof=['#866754','#68746c','#746058'][obj.variant];
    c.fillStyle='#07140d88';c.fillRect(x+7,y+12,w+7,h+7);
    c.fillStyle='#baac83';c.fillRect(x,y+23,w,h-23);
    c.fillStyle='#3c352b';c.fillRect(x+w*.65-10,y+h-25,19,25);
    c.fillStyle='#dfb974';c.fillRect(x+w*.65-6,y+h-20,4,6);
    c.fillStyle='#243d3b';c.fillRect(x+18,y+h-36,18,16);c.fillStyle='#bdab7a';c.fillRect(x+25,y+h-36,3,16);
    c.fillStyle=roof;c.beginPath();c.moveTo(x-14,y+31);c.lineTo(x+w*.5,y-28);c.lineTo(x+w+14,y+31);c.closePath();c.fill();
    c.strokeStyle='#e1cb9a8a';c.lineWidth=2;c.beginPath();c.moveTo(x-13,y+30);c.lineTo(x+w*.5,y-28);c.lineTo(x+w+13,y+30);c.stroke();
    c.strokeStyle='#503d30aa';c.lineWidth=2;for(let i=1;i<5;i++){const yy=y-11+i*9;c.beginPath();c.moveTo(x+5+i*5,yy);c.lineTo(x+w-5-i*5,yy);c.stroke();}
    c.fillStyle='#8b7b65';c.fillRect(x+w-29,y-22,14,26);c.fillStyle='#bc9b72';c.fillRect(x+w-33,y-25,22,6);
  }
  drawLandmark(mark,game){
    const c=this.ctx,x=mark.x,y=mark.y;
    if(mark.type==='npc'){
      c.fillStyle='#07150d8a';c.beginPath();c.ellipse(x,y+10,15,7,0,0,7);c.fill();
      c.fillStyle='#ab9467';c.fillRect(x-7,y+1,5,14);c.fillRect(x+3,y+1,5,14);
      c.fillStyle='#4b6257';c.beginPath();c.moveTo(x-11,y-19);c.lineTo(x+12,y-19);c.lineTo(x+15,y+8);c.lineTo(x-14,y+8);c.closePath();c.fill();
      c.fillStyle='#d1a679';c.beginPath();c.arc(x,y-23,9,0,7);c.fill();
      c.fillStyle='#9c9a86';c.beginPath();c.arc(x,y-29,9,Math.PI,7);c.fill();
      c.fillStyle='#e0c58d';c.font='bold 9px system-ui';c.textAlign='center';c.fillText('VELL',x,y-45);
    } else if(mark.type==='sign'){
      c.fillStyle='#3b3024';c.fillRect(x-2,y-18,5,31);c.fillStyle='#bb9866';c.fillRect(x-15,y-26,30,12);c.strokeStyle='#f2d49d';c.strokeRect(x-15,y-26,30,12);c.fillStyle='#725c3a';c.fillRect(x-9,y-22,18,3);
      if(['cottage','farm','forge'].includes(mark.id)){c.textAlign='center';c.font='bold 9px system-ui';c.fillStyle='#f5dcad';c.shadowColor='#091a12';c.shadowBlur=4;c.fillText(({cottage:'HOME',farm:'FARM',forge:'FORGE'})[mark.id],x,y-36);c.shadowBlur=0;}
    } else if(mark.type==='stone'){
      const isNew=['convergence-altar','elderbough','silvermere-ward','cinder-gate'].includes(mark.id);
      if(isNew){c.save();c.strokeStyle=mark.id==='elderbough'?'#86c992':mark.id==='silvermere-ward'?'#95d1dc':mark.id==='cinder-gate'?'#db8b69':'#e5c993';c.lineWidth=3;c.shadowColor=c.strokeStyle;c.shadowBlur=15;c.beginPath();c.ellipse(x,y-11,28,32,0,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x-19,y+16);c.lineTo(x-19,y-35);c.moveTo(x+19,y+16);c.lineTo(x+19,y-35);c.stroke();c.restore();}
      c.fillStyle='#06181999';c.beginPath();c.ellipse(x+2,y+9,17,7,0,0,7);c.fill();
      c.fillStyle='#9a9d8d';c.beginPath();c.moveTo(x-12,y+8);c.lineTo(x-9,y-19);c.lineTo(x-2,y-29);c.lineTo(x+10,y-23);c.lineTo(x+14,y+7);c.closePath();c.fill();
      const glow=.45+Math.sin(this.frame*2.5)*.25;
      c.strokeStyle=rgba(246,204,124,glow);c.lineWidth=2;c.beginPath();c.moveTo(x,y-18);c.lineTo(x+4,y-10);c.lineTo(x,y-3);c.lineTo(x-4,y-11);c.closePath();c.stroke();
    } else if(mark.type==='herb'){
      c.fillStyle='#2d6247';c.beginPath();c.ellipse(x,y+4,19,9,0,0,7);c.fill();
      for(let i=0;i<6;i++){
        const dx=-12+i*5;
        c.fillStyle=i%2?'#95b5a0':'#8cbba2';c.beginPath();c.ellipse(x+dx,y-3-(i%3)*3,4,8,(i-2.5)*.22,0,7);c.fill();
      }
      c.fillStyle='#b7e2c6';c.font='bold 10px system-ui';c.textAlign='center';c.fillText('HERBS',x,y-25);
    } else if(mark.type==='fire'){
      c.fillStyle='#342b24';c.beginPath();c.ellipse(x,y+7,15,8,0,0,7);c.fill();
      for(let i=0;i<7;i++){let a=i*Math.PI*2/7;c.fillStyle='#aaab91';c.beginPath();c.arc(x+Math.cos(a)*11,y+6+Math.sin(a)*5,4.5,0,7);c.fill();}
      const flame=Math.sin(this.frame*8)*3;
      c.fillStyle='#f6a74a';c.beginPath();c.moveTo(x-7,y+4);c.quadraticCurveTo(x-5,y-8+flame,x,y-19);c.quadraticCurveTo(x+10,y-8-flame,x+6,y+5);c.closePath();c.fill();
      c.fillStyle='#ffe0a0';c.beginPath();c.ellipse(x,y+1,3.5,7,0,0,7);c.fill();
    }
  }
  drawPlayer(p){
    const c=this.ctx,x=p.x,y=p.y,bob=Math.sin(p.walkingTime)* (p.moving?2.1:0);
    c.save();c.translate(x,y+bob);if(p.rolling>0){c.rotate(Math.atan2(p.rollY,p.rollX)+Math.PI/2);}
    c.fillStyle='#0715149a';c.beginPath();c.ellipse(2,13,14,6,0,0,7);c.fill();
    c.fillStyle=p.invulnerable?'#edc890':'#303c40';c.fillRect(-7,5,6,12);c.fillRect(2,5,6,12);
    c.fillStyle='#5a443c';c.beginPath();c.moveTo(-14,-14);c.lineTo(14,-14);c.lineTo(18,12);c.lineTo(-18,12);c.closePath();c.fill();
    c.fillStyle='#b89a74';c.beginPath();c.moveTo(-11,-13);c.lineTo(9,-15);c.lineTo(7,7);c.lineTo(-11,7);c.closePath();c.fill();
    c.fillStyle='#263d42';c.fillRect(-10,-6,20,15);
    c.fillStyle='#d9b37e';c.fillRect(-10,3,20,3);
    c.fillStyle='#d9ae87';c.beginPath();c.arc(0,-18,9,0,7);c.fill();
    c.fillStyle='#282d2c';c.beginPath();c.arc(0,-22,9,Math.PI,7);c.lineTo(9,-21);c.fill();
    c.fillStyle='#1e2929';c.fillRect(-5,-17,2,2);c.fillRect(4,-17,2,2);
    c.strokeStyle='#d9d2c0';c.lineWidth=2.3;c.beginPath();c.moveTo(12,-5);c.lineTo(15,-22);c.stroke();
    c.strokeStyle='#bd9875';c.beginPath();c.moveTo(9,-4);c.lineTo(17,-3);c.stroke();
    if(p.attack){
      const spec=p.attack.kind==='heavy'?{range:75,spread:1.1,color:'#f1ac76'}:{range:57,spread:.95,color:'#f9deaa'};
      if(p.attack.elapsed>.07&&p.attack.elapsed<(p.attack.kind==='heavy'?.58:.27)){
        const angle=Math.atan2(p.facingY,p.facingX),alpha=Math.sin(Math.min(1,p.attack.elapsed/(p.attack.kind==='heavy'?.58:.27))*Math.PI)*.82;
        c.strokeStyle=rgba(p.attack.kind==='heavy'?239:249,p.attack.kind==='heavy'?170:222,p.attack.kind==='heavy'?114:170,alpha);c.lineWidth=p.attack.kind==='heavy'?11:6;
        c.beginPath();c.arc(0,0,spec.range,angle-spec.spread,angle+spec.spread);c.stroke();
        c.strokeStyle='rgba(255,246,204,.7)';c.lineWidth=1.5;c.beginPath();c.arc(0,0,spec.range+5,angle-spec.spread,angle+spec.spread);c.stroke();
      }
    }
    if(p.parryTimer>0){
      c.strokeStyle=p.parryTimer>.18?'#9ee1d8':'#91a5a2';c.lineWidth=3;c.beginPath();
      c.arc(0,0,24,Math.atan2(p.facingY,p.facingX)-1.2,Math.atan2(p.facingY,p.facingX)+1.2);c.stroke();
    }
    if(p.hitFlash>0){c.fillStyle='rgba(255,104,96,.35)';c.beginPath();c.ellipse(0,-9,17,26,0,0,7);c.fill();}
    if(p.invulnerable){c.strokeStyle='#f5dc9ab3';c.lineWidth=1.5;c.beginPath();c.ellipse(0,-3,20,27,0,0,7);c.stroke();}
    c.restore();
  }
  drawEnemy(e){
    const c=this.ctx;c.save();c.translate(e.x,e.y);
    if(e.state==='windup'){
      const progress=1-e.timer/e.windup;
      c.fillStyle=rgba(237,83,72,.12+progress*.22);
      c.strokeStyle=rgba(250,113,90,.55+progress*.4);c.lineWidth=2.5+progress*1.5;
      c.beginPath();c.arc(0,0,e.reach+16,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle=rgba(247,135,108,.16+progress*.3);
      c.beginPath();c.moveTo(0,0);const a=Math.atan2(e.facingY,e.facingX);
      c.arc(0,0,e.reach+16,a-.68,a+.68);c.closePath();c.fill();
    }
    if(e.elite||e.captain){c.shadowColor=e.kind==='thorn-matriarch'?'#6ecf81':e.kind==='drowned-herald'?'#73d0e7':e.kind==='cinder-regent'?'#f57559':e.recruited?'#73ead0':'#f0c17b';c.shadowBlur=17;}
    c.fillStyle='#05121288';c.beginPath();c.ellipse(3,13,e.radius+9,8,0,0,7);c.fill();
    c.fillStyle=e.hitFlash>0?'#fbd4af':e.recruited?'#4d988e':e.captain?'#a67b88':e.color;
    c.beginPath();c.moveTo(-e.radius,-16);c.lineTo(e.radius,-16);c.lineTo(e.radius+4,12);c.lineTo(-e.radius-4,12);c.closePath();c.fill();
    c.fillStyle=e.elite?'#e0d5b4':'#c8b2a5';c.beginPath();c.arc(0,-22,e.elite?12:9,0,7);c.fill();
    c.fillStyle=e.elite?'#5c534b':'#394749';c.beginPath();c.arc(0,-26,e.elite?13:10,Math.PI,Math.PI*2);c.closePath();c.fill();
    c.fillStyle='#e7a280';c.fillRect(-5,-24,3,2);c.fillRect(4,-24,3,2);
    c.strokeStyle=e.elite?'#d4b984':'#bab7af';c.lineWidth=e.elite?5:3;
    c.beginPath();c.moveTo(e.radius-1,-8);c.lineTo(e.radius+10,-28);c.stroke();
    if(e.elite||e.captain){c.strokeStyle=e.recruited?'#8df0d6':'#dfbd7c';c.lineWidth=3;c.beginPath();c.moveTo(-10,-33);c.lineTo(-13,-48);c.lineTo(-4,-40);c.lineTo(4,-49);c.lineTo(12,-37);c.stroke();}
    c.shadowBlur=0;
    if(e.state==='stagger'){
      c.fillStyle='#ace1ef';c.font='bold 14px system-ui';c.textAlign='center';c.fillText('✧',0,-49);
    }
    const barWidth=e.elite?62:43;
    c.fillStyle='#061516d9';c.fillRect(-barWidth/2,-e.radius-41,barWidth,5);
    c.fillStyle=e.recruited?'#83ead0':e.elite?'#eac57d':e.captain?'#dcb184':'#d77a78';c.fillRect(-barWidth/2,-e.radius-41,barWidth*Math.max(0,e.health/e.maxHealth),5);
    if(e.elite&&e.kind!=='ash-warden'){c.fillStyle='#fce6bd';c.textAlign='center';c.font='bold 10px system-ui';c.shadowColor='#051613';c.shadowBlur=5;c.fillText(e.name.toUpperCase(),0,-e.radius-49);c.shadowBlur=0;}
    if(e.captain){c.fillStyle=e.recruited?'#9ff6de':'#ffe1a6';c.textAlign='center';c.font='bold 10px system-ui';c.shadowColor='#051613';c.shadowBlur=5;c.fillText(`${e.name} · R${e.rank}`,0,-e.radius-48);c.shadowBlur=0;}
    c.restore();
  }
  drawDrop(drop){
    const c=this.ctx,hover=Math.sin(this.frame*3+drop.x*.01)*3;
    c.save();c.translate(drop.x,drop.y+hover);
    c.fillStyle='#0a171586';c.beginPath();c.ellipse(0,9,12,5,0,0,7);c.fill();
    c.shadowColor='#efcf83';c.shadowBlur=17;c.fillStyle='#ffe0a0';
    c.beginPath();c.moveTo(0,-17);c.lineTo(9,-6);c.lineTo(0,5);c.lineTo(-9,-6);c.closePath();c.fill();
    c.shadowBlur=0;c.strokeStyle='#fff2cf';c.lineWidth=1.2;c.stroke();c.restore();
  }
  drawCombatEffects(game){
    const c=this.ctx;c.textAlign='center';c.font='bold 14px system-ui';
    for(const fx of game.fx||[]){
      c.globalAlpha=Math.min(1,fx.life*2);c.fillStyle=fx.color;
      c.shadowColor='#041514';c.shadowBlur=5;
      c.fillText(fx.text,fx.x,fx.y-(1-fx.life/fx.maxLife)*35);
    }
    c.shadowBlur=0;c.globalAlpha=1;
  }
  drawBeacons(game){
    const quest=storyObjective(game)||QUEST_STEPS[Math.min(game.questStep,2)], mark=this.world.landmarks.find(p=>p.id===quest.target);
    if(!mark)return;
    const c=this.ctx,x=mark.x,y=mark.y-58+Math.sin(this.frame*3.4)*4;
    c.fillStyle='#f5cf86';c.textAlign='center';c.font='bold 24px Georgia,serif';c.shadowColor='#efc17a';c.shadowBlur=18;c.fillText(['convergence-altar','elderbough','silvermere-ward','cinder-gate'].includes(mark.id)?'◇':'✦',x,y);c.shadowBlur=0;
    c.strokeStyle='#d9b47655';c.beginPath();c.arc(mark.x,mark.y,21+Math.sin(this.frame*2)*3,0,7);c.stroke();
  }
  drawLighting(game){
    const c=this.ctx,level=game.clock.lightLevel;
    if(level>.005){
      c.fillStyle=rgba(5,17,39,level*.83);c.fillRect(0,0,this.width,this.height);
      // Warm lantern glow around the player at night.
      const x=game.player.x-this.camera.x,y=game.player.y-this.camera.y;
      c.globalCompositeOperation='screen';
      const glow=c.createRadialGradient(x,y,8,x,y,156);
      glow.addColorStop(0,rgba(240,174,81,level*.25));glow.addColorStop(1,'rgba(240,174,81,0)');
      c.fillStyle=glow;c.fillRect(x-160,y-160,320,320);c.globalCompositeOperation='source-over';
    }
    if(game.worldEvent?.id==='eclipse'){c.fillStyle='rgba(115,26,54,.13)';c.fillRect(0,0,this.width,this.height);}
    if(game.worldEvent?.id==='ashfall'){c.fillStyle='rgba(179,95,49,.1)';c.fillRect(0,0,this.width,this.height);}
    if(game.clock.season==='Autumn'){c.fillStyle='rgba(185,100,32,.08)';c.fillRect(0,0,this.width,this.height);}
    if(game.clock.season==='Winter'){c.fillStyle='rgba(122,171,201,.13)';c.fillRect(0,0,this.width,this.height);}
    if(game.clock.season==='Summer'){c.fillStyle='rgba(248,201,108,.035)';c.fillRect(0,0,this.width,this.height);}
    if(game.clock.period==='EVENING') {c.fillStyle='rgba(204,116,55,.055)';c.fillRect(0,0,this.width,this.height);}
  }
  drawAtmosphere(game){
    const c=this.ctx;
    if(game.clock.weather==='RAIN'){
      c.strokeStyle='rgba(190,219,236,.26)';c.lineWidth=1.1;
      for(let i=0;i<100;i++){
        const x=(i*149.1+this.frame*85)%(this.width+60)-30;
        const y=(i*97.7+this.frame*240)%(this.height+80)-40;
        c.beginPath();c.moveTo(x,y);c.lineTo(x-5,y+15);c.stroke();
      }
    }
    if(game.worldEvent?.id==='ashfall'){
      c.fillStyle='rgba(232,174,132,.3)';
      for(let i=0;i<45;i++){const x=(i*121+this.frame*19)%(this.width+30),y=(i*77+this.frame*(18+i%5))%(this.height+30);c.fillRect(x,y,2,2);}
    }
    if(game.clock.season==='Winter'){
      c.fillStyle='rgba(238,244,249,.42)';
      for(let i=0;i<35;i++){
        const x=(i*177.4+Math.sin(this.frame*.6+i)*20)%(this.width+30);
        const y=(i*87.6+this.frame*(12+i%4))%(this.height+30);
        c.beginPath();c.arc(x,y,1.4,0,7);c.fill();
      }
    }
    for(let i=0;i<23;i++){
      const x=((i*113.4+Math.sin(this.frame*.36+i)*32-this.camera.x*.06)%(this.width+90)+(this.width+90))%(this.width+90);
      const y=((i*71.27-this.frame*(4+i%4)-this.camera.y*.04)%(this.height+60)+(this.height+60))%(this.height+60);
      c.fillStyle=rgba(246,213,153,.12+.11*Math.sin(this.frame*.7+i)**2);
      c.beginPath();c.arc(x,y,1+(i%3)*.55,0,7);c.fill();
    }
  }
  createMap(){
    const canvas=document.createElement('canvas');canvas.width=this.world.width*3;canvas.height=this.world.height*3;
    const c=canvas.getContext('2d');
    const colors=['#506e4b','#3b6044','#b7a075','#3c7880','#d2bb8d','#8e7549','#8d8c7c','#628653'];
    for(let y=0;y<this.world.height;y++)for(let x=0;x<this.world.width;x++){c.fillStyle=colors[this.world.tiles[y][x]];c.fillRect(x*3,y*3,3,3);}
    c.fillStyle='#223c30';for(const o of this.world.objects){if(o.kind==='tree')c.fillRect(o.x/TILE*3-1,o.y/TILE*3-1,3,3);}
    c.fillStyle='#d6b981';for(const o of this.world.objects){if(o.kind==='house')c.fillRect(o.x/TILE*3,o.y/TILE*3,o.w/TILE*3,o.h/TILE*3);}
    return canvas;
  }
  drawMap(canvas,game){
    if(!canvas)return;
    const c=canvas.getContext('2d');const w=canvas.width,h=canvas.height;
    c.clearRect(0,0,w,h);c.drawImage(this.mapCache,0,0,w,h);
    for(const mark of this.world.landmarks){
      const x=mark.x/this.world.pixelWidth*w,y=mark.y/this.world.pixelHeight*h;
      c.fillStyle=mark.type==='npc'?'#e9dba7':'#e2ad6b';c.beginPath();c.arc(x,y,mark.type==='npc'?3.8:2.6,0,7);c.fill();
    }
    for(const npc of game.npcs||[]){
      c.fillStyle=npc.shop?'#efcf84':'#cbd6df';
      c.beginPath();c.arc(npc.x/this.world.pixelWidth*w,npc.y/this.world.pixelHeight*h,2.7,0,7);c.fill();
    }
    for(const enemy of game.enemies||[]){
      if(!enemy.alive)continue;
      c.fillStyle=enemy.recruited?'#7fe1ca':enemy.elite?'#f6ca76':enemy.captain?'#d3a2e1':'#eaa18a';
      c.beginPath();c.arc(enemy.x/this.world.pixelWidth*w,enemy.y/this.world.pixelHeight*h,enemy.elite?4.3:2.1,0,7);c.fill();
    }
    const quest=storyObjective(game)||QUEST_STEPS[Math.min(game.questStep,2)],target=this.world.landmarks.find(p=>p.id===quest.target);
    if(target){const tx=target.x/this.world.pixelWidth*w,ty=target.y/this.world.pixelHeight*h;c.strokeStyle='#ffdd95';c.lineWidth=2;c.beginPath();c.arc(tx,ty,6.5,0,7);c.stroke();}
    const px=game.player.x/this.world.pixelWidth*w,py=game.player.y/this.world.pixelHeight*h;
    c.fillStyle='#fff5d8';c.strokeStyle='#132525';c.lineWidth=2.5;c.beginPath();c.arc(px,py,5.5,0,7);c.fill();c.stroke();
    // Draw viewport outline only on small minimap.
    if(canvas.id==='minimap-canvas'){
      c.strokeStyle='#f9d6a244';c.lineWidth=1;
      c.strokeRect(this.camera.x/this.world.pixelWidth*w,this.camera.y/this.world.pixelHeight*h,this.width/this.world.pixelWidth*w,this.height/this.world.pixelHeight*h);
    }
  }
}
