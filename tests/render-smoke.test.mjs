import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

/** Headless DOM/Canvas smoke test of the built standalone bundle.
 * It cannot replace a real browser visual test, but catches missing DOM hooks
 * and rendering-time JS errors in a dependency-free project. */
class ClassList{
  constructor(){this.values=new Set();}
  add(name){this.values.add(name);}
  remove(name){this.values.delete(name);}
  toggle(name,force){if(force===undefined)force=!this.values.has(name);if(force)this.add(name);else this.remove(name);return force;}
  contains(name){return this.values.has(name);}
}
const methodNames='save restore translate strokeRect fillRect beginPath ellipse fill arc moveTo lineTo closePath quadraticCurveTo createRadialGradient drawImage fillText rotate clearRect stroke setTransform'.split(' ');
function fakeContext(){
  const ctx={createRadialGradient:()=>({addColorStop(){}})};
  for(const name of methodNames)if(name!=='createRadialGradient')ctx[name]=()=>{};
  return ctx;
}
function fakeNode(id){return {id,style:{},dataset:{},classList:new ClassList(),textContent:'',innerHTML:'',addEventListener(){},getContext:()=>fakeContext(),getBoundingClientRect:()=>({width:1440,height:900}),setAttribute(){},appendChild(){}};}

test('Offline bundle can initialize, render, open inventory and attack without DOM exceptions',()=>{
  const nodes=new Map();const getNode=id=>{if(!nodes.has(id))nodes.set(id,fakeNode(id));return nodes.get(id);};
  const listeners={};let nextFrame=null;
  const document={getElementById:getNode,createElement:tag=>fakeNode(tag),querySelectorAll:()=>[],addEventListener:(name,fn)=>{listeners[name]=fn;},body:fakeNode('body')};
  const window={innerWidth:1440,innerHeight:900,devicePixelRatio:1,addEventListener(){}},storage=new Map();
  const context=vm.createContext({document,window,Math,Date,Set,Map,Number,Array,Object,JSON,
    localStorage:{setItem:(key,val)=>storage.set(key,val),getItem:key=>storage.get(key)||null},
    requestAnimationFrame:callback=>{nextFrame=callback;},clearTimeout(){},setTimeout(){return 1;},console});
  const source=fs.readFileSync(new URL('../js/offline.bundle.js',import.meta.url),'utf8');
  vm.runInContext(source,context,{timeout:5000});
  const game=window.__lifeOfPGame;
  assert.equal(window.__lifeOfPReady,true);
  assert.ok(game,'Game instance should initialize');
  game.newGame();
  assert.equal(game.started,true);
  assert.doesNotThrow(()=>nextFrame(16));
  assert.equal(getNode('equipped-weapon').textContent,'Wanderer’s Blade');
  assert.ok(getNode('boss-hud'));
  game.action('inventory');
  assert.ok(getNode('modal-body').innerHTML.includes('Ember Flask'));
  game.closeModal();
  game.action('life');
  assert.ok(getNode('modal-body').innerHTML.includes('Living in the Ashen Verge'));
  game.closeModal();
  game.action('crafting');
  assert.ok(getNode('modal-body').innerHTML.includes('Herbal Ember Flask'));
  game.closeModal();
  const plot=game.farm[0];game.player.x=plot.x*32+16;game.player.y=plot.y*32+16;
  game.interact();
  assert.ok(getNode('modal-body').innerHTML.includes('Till this soil'));
  game.action('farm:till:35-41');
  game.action('farm:plant:35-41:turnip');
  game.action('farm:water:35-41');
  assert.equal(plot.cropId,'turnip');assert.equal(plot.watered,true);
  game.closeModal();
  const home=game.world.landmarks.find(p=>p.id==='cottage');
  game.player.x=home.x;game.player.y=home.y;
  game.interact();
  assert.ok(getNode('modal-body').innerHTML.includes('Claim cottage'));
  game.action('home:claim');
  assert.equal(game.homeOwned,true);
  game.action('home:rest');
  assert.equal(game.clock.day,2);
  game.player.x=plot.x*32+16;game.player.y=plot.y*32+16;
  game.closeModal();
  const mira=game.npcs.find(n=>n.id==='mira');game.player.x=mira.x;game.player.y=mira.y;
  game.interact();
  assert.ok(getNode('modal-body').innerHTML.includes('Friendship'));
  game.action('talk:mira');
  assert.equal(game.social.affinity.mira,10);
  game.closeModal();
  game.player.x=1568;game.player.y=1184;
  game.player.facingX=1;game.player.facingY=0;
  assert.doesNotThrow(()=>game.action('light-attack'));
  assert.doesNotThrow(()=>nextFrame(250));
  assert.ok(game.player.attack);
  assert.doesNotThrow(()=>nextFrame(400));
  assert.doesNotThrow(()=>game.action('pause'));
  game.save(false);
  assert.equal(JSON.parse(storage.get('life-of-p-phase1-v1')).version,5);
  game.action('main-menu');
  game.action('continue-game');
  assert.equal(game.started,true);
  assert.ok(game.player.health>0);
  game.action('nemesis');
  assert.ok(getNode('modal-body').innerHTML.includes('RIVAL HIERARCHY'));
  assert.ok(getNode('modal-body').innerHTML.includes('RANK 1'));
  game.closeModal();
  const vell=game.world.landmarks.find(m=>m.id==='vell');
  game.player.x=vell.x;game.player.y=vell.y;
  game.interact();
  assert.ok(getNode('modal-body').innerHTML.includes('Ask Vell'));
  game.action('dialogue:vell:appeal');
  assert.equal(game.dialogue.flags.vell,'appeal');
  game.save(false);
  game.mainMenu();game.continueGame();
  assert.equal(game.dialogue.flags.vell,'appeal');
});
