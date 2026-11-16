/** Phase 5 original-world narrative. A fan crossover may be a private design exercise;
 * this distributable prototype uses original characters and places instead. */
export const SIGILS=Object.freeze([
  {id:'grove',name:'Verdant Sigil',boss:'thorn-matriarch',zone:'THE FORGOTTEN GROVE',hint:'Northwest: seek the Thorn Matriarch beneath the Elderbough.'},
  {id:'mere',name:'Tidal Sigil',boss:'drowned-herald',zone:'SILVERMERE',hint:'West: confront the Drowned Herald on the shore of Silvermere.'},
  {id:'cinder',name:'Cinder Sigil',boss:'cinder-regent',zone:'FALLEN REACH',hint:'Northeast: defeat the Cinder Regent beyond the ruined sanctum.'}
]);
export const ALIGNMENTS=Object.freeze({
  hero:{title:'THE PARAGON',short:'Paragon',perk:'Guardian’s Vow: +3 protection against incoming attacks.',description:'Unite the valley and restore the three fractured wards. Protect the people against the Syndicate of Ruin.',endingTitle:'THE DAWN RETURNED',endingText:'P bound the three sigils together, breaking the Syndicate’s hold. The valley found the courage to govern itself, and the Unwritten Soul became a story told by firelight.'},
  villain:{title:'THE USURPER',short:'Usurper',perk:'War Crown: +5 damage with every weapon.',description:'Claim the three sigils, bend the ruins to your will, and rule the valley rather than save it.',endingTitle:'THE ASHEN CROWN',endingText:'P wove the three sigils into a crown. The Syndicate fell, but the Ashen Verge rose beneath a new and unyielding sovereign. Every heir inherits the consequences.'},
  civilian:{title:'THE HEARTHKEEPER',short:'Civilian',perk:'Homestead Spirit: 15% faster stamina recovery.',description:'Refuse the great war. Build a home and leave a legacy that outlasts crowns.',endingTitle:'THE UNBROKEN HEARTH',endingText:'While warlords fought over the world, P built a home, shared a harvest, and raised another generation. In the end, the valley remembered those small acts of hope.'}
});
export const STORY_SCENES=Object.freeze({
  'convergence-altar':{name:'The Convergence Altar',intro:'The altar hums with three empty sockets. The stones are waiting for someone who can decide what the world becomes.'},
  'elderbough':{name:'The Elderbough',intro:'Roots twist into an ancient throne. A voice whispers from the heartwood, demanding a sacrifice.'},
  'silvermere-ward':{name:'The Silvermere Ward',intro:'Beneath still waters, a bell tolls for everyone the Convergence erased.'},
  'cinder-gate':{name:'The Cinder Gate',intro:'A shattered arch frames a sky the color of old embers. The Syndicate’s final seal waits here.'}
});
