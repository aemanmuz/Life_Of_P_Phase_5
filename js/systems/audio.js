/** Phase 5 procedural, original audio. Starts only after a player presses SOUND ON.
 * Web Audio oscillators synthesize subtle ambient tones and UI/combat effects;
 * no external tracks, copyrighted music, or sound files are needed. */
export class GameAudio {
  constructor(){this.enabled=false;this.context=null;this.master=null;this.musicTimer=0;this.note=0;this.zone='';}
  toggle(){
    if(this.enabled){this.enabled=false;if(this.master)this.master.gain.setTargetAtTime(0,this.context.currentTime,.05);return false;}
    const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContext)return false;
    try{
      if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);}
      this.context.resume?.();this.master.gain.setTargetAtTime(.28,this.context.currentTime,.12);
      this.enabled=true;this.musicTimer=0;this.sound('open');return true;
    }catch{return false;}
  }
  /** Soft, original two-note modes adapt to exploration, danger and boss fights. */
  update(game,dt){
    if(!this.enabled||!this.context||game.paused||!game.started)return;
    this.musicTimer-=dt;if(this.musicTimer>0)return;
    const boss=game.enemies.some(e=>e.elite&&e.alive&&Math.hypot(e.x-game.player.x,e.y-game.player.y)<420);
    const region=game.world.getZone(game.player.x,game.player.y);
    const danger=boss||region==='FALLEN REACH';
    const root=danger?110:region==='SILVERMERE'?174.61:146.83;
    const intervals=danger?[1,1.059,1.498,1.335,1.189,1.335]:[1,1.498,1.26,1.498,1.334,1.122];
    const step=this.note++%intervals.length;
    this.tone(root*intervals[step],danger?1.45:2.7,.045,danger?'triangle':'sine');
    if(step%3===0)this.tone(root*.5,danger?1.9:3.1,.022,'sine');
    this.musicTimer=danger?.63:1.32;
  }
  tone(freq,duration,volume=.1,wave='sine'){
    if(!this.context||!this.enabled)return;
    const now=this.context.currentTime,osc=this.context.createOscillator(),gain=this.context.createGain();
    osc.type=wave;osc.frequency.setValueAtTime(freq,now);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),now+.03);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(this.master);osc.start(now);osc.stop(now+duration+.03);
  }
  sound(type){
    if(!this.enabled||!this.context)return;
    const sequence={open:[620,850],light:[230],heavy:[135,98],parry:[740,990],roll:[145],hit:[84],kill:[195,285,440],pickup:[500,670],sigil:[392,523,784],ending:[293.66,392,587.33,783.99]}[type];
    if(!sequence)return;
    sequence.forEach((freq,i)=>{
      const now=this.context.currentTime+i*.075,osc=this.context.createOscillator(),gain=this.context.createGain();
      osc.type=['hit','heavy','roll'].includes(type)?'triangle':'sine';
      osc.frequency.value=freq;
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.085,now+.01);
      gain.gain.exponentialRampToValueAtTime(.0001,now+.19);
      osc.connect(gain);gain.connect(this.master);osc.start(now);osc.stop(now+.21);
    });
  }
}
