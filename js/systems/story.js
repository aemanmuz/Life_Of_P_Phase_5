import {ALIGNMENTS,SIGILS} from '../data/story.js';
import {addItem} from '../data/items.js';

/** Choice, sigils, and ending history are part of the browser save. */
export function makeStory(){return {alignment:null,sigils:[],ending:null,events:[],civilianReady:false};}
export function loadStory(raw){const out=makeStory();if(!raw||typeof raw!=='object')return out;
  if(Object.hasOwn(ALIGNMENTS,raw.alignment))out.alignment=raw.alignment;
  if(Array.isArray(raw.sigils))out.sigils=SIGILS.filter(s=>raw.sigils.includes(s.id)).map(s=>s.id);
  if(out.alignment&&raw.ending===out.alignment)out.ending=raw.ending;
  if(Array.isArray(raw.events))out.events=raw.events.filter(e=>typeof e==='string'&&e.length<210).slice(0,24);
  return out;
}
export function chooseAlignment(game,alignment){
  if(!Object.hasOwn(ALIGNMENTS,alignment))return {ok:false,message:'Unknown destiny.'};
  if(game.story.alignment)return {ok:false,message:'Your destiny has already been chosen.'};
  if(game.questStep<2)return {ok:false,message:'Complete the waystone quest and return to Vell first.'};
  game.story.alignment=alignment;
  game.story.events.unshift(`Day ${game.clock.day}: P swore the ${ALIGNMENTS[alignment].short} oath.`);
  return {ok:true,message:`Your path is set: ${ALIGNMENTS[alignment].title}. Open O to track your destiny.`};
}
export function onStoryBossKilled(game,enemy){
  const sigil=SIGILS.find(s=>s.boss===enemy.kind);
  if(!sigil||game.story.sigils.includes(sigil.id))return null;
  game.story.sigils.push(sigil.id);
  game.story.events.unshift(`Day ${game.clock.day}: ${sigil.name} recovered from ${enemy.name}.`);
  game.story.events=game.story.events.slice(0,24);
  return sigil;
}
export function endingEligibility(game){
  if(!game.story.alignment)return {ready:false,reason:'First complete the waystone quest, then take an oath at the Convergence Altar.'};
  if(game.story.ending)return {ready:false,reason:'This destiny has already reached its ending. Continue playing in the open world.'};
  if(game.story.alignment==='civilian'){
    const hasHome=Boolean(game.homeOwned);
    const hasHeir=Boolean(game.social?.generation>=2);
    return {ready:hasHome&&hasHeir,reason:!hasHome?'Claim the Fallow Cottage (50 gold).':!hasHeir?'Raise an heir and retire into the next generation.':'Your family legacy is ready to be recorded.'};
  }
  const missing=SIGILS.filter(s=>!game.story.sigils.includes(s.id));
  return {ready:missing.length===0,reason:missing.length?`Recover ${missing.map(s=>s.name).join(', ')} before claiming your fate.`:'All three sigils resonate. Return to the Convergence Altar.'};
}
export function finishStory(game){
  const condition=endingEligibility(game);if(!condition.ready)return {ok:false,message:condition.reason};
  const key=game.story.alignment;game.story.ending=key;
  game.story.events.unshift(`Day ${game.clock.day}: ${ALIGNMENTS[key].endingTitle} — the story of P reached its ending.`);
  game.story.events=game.story.events.slice(0,24);
  if(key!=='civilian'){game.player.gold+=500;addItem(game.inventory,'ember-flask',5);}
  if(key==='hero')addItem(game.inventory,'dawnward-armor');
  else if(key==='villain')addItem(game.inventory,'eclipse-sabre');
  else {addItem(game.inventory,'hearthloom-coat');addItem(game.inventory,'field-stew',5);game.player.gold+=150;}
  return {ok:true,message:ALIGNMENTS[key].endingTitle,ending:ALIGNMENTS[key]};
}
export function storyObjective(game){
  if(game.questStep<2)return null;
  if(game.story.ending)return {name:'The Story Continues',description:`${ALIGNMENTS[game.story.ending].endingTitle} · Explore the living valley at your own pace.`,target:null};
  if(!game.story.alignment)return {name:'An Unwritten Destiny',description:'Approach the Convergence Altar north of the crossroads. Choose your future.',target:'convergence-altar'};
  if(game.story.alignment==='civilian'){
    const condition=endingEligibility(game);
    return {name:'The Quiet Road',description:condition.reason,target:condition.ready?'convergence-altar':'cottage'};
  }
  const next=SIGILS.find(s=>!game.story.sigils.includes(s.id));
  if(next)return {name:`Hunt: ${next.name}`,description:next.hint,target:({'grove':'elderbough','mere':'silvermere-ward','cinder':'cinder-gate'})[next.id]};
  return {name:'Fate at the Altar',description:'Three sigils recovered. Return to the Convergence Altar and resolve the war.',target:'convergence-altar'};
}
