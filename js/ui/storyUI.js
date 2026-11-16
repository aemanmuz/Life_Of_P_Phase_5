import {SIGILS,ALIGNMENTS} from '../data/story.js';
import {endingEligibility,storyObjective} from '../systems/story.js';
import {eventForDay} from '../systems/worldEvents.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function storyMarkup(game){
  const story=game.story,alignment=story.alignment?ALIGNMENTS[story.alignment]:null;
  const quest=storyObjective(game),condition=endingEligibility(game),event=eventForDay(game.clock.day);
  return `<div class="story-lead"><span class="eyebrow">ACT II · THE CONVERGENCE OF ASHES</span><h3>${alignment?alignment.title:'THE UNWRITTEN SOUL'}</h3><p>${alignment?alignment.description+' '+alignment.perk:'Three sigils seal the rift beneath the valley. You alone can choose to restore, conquer, or ignore the struggle.'}</p></div>
  <div class="story-progress"><span>RECOVERED SIGILS</span><strong>${story.sigils.length} / 3</strong></div>
  <div class="story-sigils">${SIGILS.map(s=>`<div class="story-sigil ${story.sigils.includes(s.id)?'earned':''}"><span class="sigil-icon">${story.sigils.includes(s.id)?'✦':'◇'}</span><strong>${s.name}</strong><small>${story.sigils.includes(s.id)?'RECOVERED':s.zone}</small><p>${s.hint}</p></div>`).join('')}</div>
  ${quest?`<div class="objective-card"><strong>${esc(quest.name)}</strong><p>${esc(quest.description)}</p></div>`:''}
  ${!story.alignment?`<div class="phase-card"><p>Finish the introductory waystone quest, then travel to the Convergence Altar north of town to choose an oath.</p><button class="life-button" data-action="story:show-alignment" ${game.questStep<2?'disabled':''}>Choose your destiny at the Altar</button></div>`:''}
  ${story.alignment&&!story.ending?`<p><strong>Ending condition:</strong> ${esc(condition.reason)}</p><div class="life-actions"><button class="life-button" data-action="story:finish" ${!condition.ready?'disabled':''}>Conclude your journey at the Altar</button></div><p class="subtle">You must physically visit the Altar to make the final choice.</p>`:''}
  ${story.ending?`<div class="story-ending"><span>ENDING UNLOCKED</span><h3>${ALIGNMENTS[story.ending].endingTitle}</h3><p>${ALIGNMENTS[story.ending].endingText}</p></div>`:''}
  <h3>World Event · Day ${game.clock.day}</h3><p><strong style="color:${event.color}">${event.icon} ${event.name}</strong> — ${event.description}</p>
  <h3>Chronicle</h3><div class="rival-history">${story.events.length?story.events.map(e=>`<p>${esc(e)}</p>`).join(''):'<p>Your story has yet to be written.</p>'}</div>`;
}
export function altarMarkup(game){
  const story=game.story,condition=endingEligibility(game);
  if(story.ending)return `<div class="story-ending"><span>YOUR ENDING</span><h3>${ALIGNMENTS[story.ending].endingTitle}</h3><p>${ALIGNMENTS[story.ending].endingText}</p></div><button class="life-button" data-action="story-board">Return to the chronicle</button>`;
  if(!story.alignment)return `<p>The altar asks a single question: <em>What sort of life will P choose?</em></p>${game.questStep<2?'<p>First find the Old Waystone and return to Vell.</p>':`<div class="story-choices">${Object.entries(ALIGNMENTS).map(([key,v])=>`<button class="dialogue-choice" data-action="story:alignment:${key}"><strong>${v.title}</strong><span>${v.description} <em>${v.perk}</em></span></button>`).join('')}</div><p class="subtle">Choosing an oath is permanent for this save. The Civilian path can conclude without killing the story bosses.</p>`}`;
  return `<div class="story-lead"><span class="eyebrow">${ALIGNMENTS[story.alignment].title}</span><h3>THE ALTAR AWAITS</h3><p>${condition.reason}</p></div><button class="life-button" data-action="story:finish" ${!condition.ready?'disabled':''}>${condition.ready?'✧ Weave the final destiny':'Destiny not yet ready'}</button><div class="life-actions"><button class="life-button" data-action="story-board">View Chronicle (O)</button></div>`;
}
export function epilogueMarkup(game){const a=ALIGNMENTS[game.story.ending];return `<div class="epilogue-crown">✧</div><p class="eyebrow">LIFE OF P · YOUR LEGACY</p><h2>${a.endingTitle}</h2><p>${a.endingText}</p><div class="epilogue-stats"><span>DAY ${game.clock.day}</span><span>GENERATION ${game.social.generation}</span><span>${game.player.kills} DEFEATS</span><span>${game.story.sigils.length} SIGILS</span></div><button class="primary-button" data-action="close-epilogue">CONTINUE YOUR LIFE IN THE VALLEY ↗</button>`;}
