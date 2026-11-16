/** Translate keyboard + optional touch buttons into game actions. */
const MOVE_KEYS = {ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
export class Input {
  constructor() {
    this.held=new Set();
    this.justPressed=new Set();
    this.touchHeld=new Set();
    window.addEventListener('keydown',event=>{
      const key=event.code;
      if(key in MOVE_KEYS || ['Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(key)) event.preventDefault();
      if(!this.held.has(key)) this.justPressed.add(key);
      this.held.add(key);
    });
    window.addEventListener('keyup',event=>this.held.delete(event.code));
    window.addEventListener('blur',()=>this.reset());
    document.querySelectorAll('[data-move]').forEach(button=>{
      const direction=button.dataset.move;
      button.addEventListener('pointerdown',event=>{event.preventDefault();this.touchHeld.add(direction);button.setPointerCapture(event.pointerId);});
      for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>this.touchHeld.delete(direction));
    });
  }
  reset(){this.held.clear();this.justPressed.clear();this.touchHeld.clear();}
  down(code){return this.held.has(code);}
  consume(code){const found=this.justPressed.has(code);this.justPressed.delete(code);return found;}
  consumeAny(...codes){return codes.some(code=>this.consume(code));}
  direction(){
    const directions=new Set([...this.touchHeld]);
    for(const [code,name] of Object.entries(MOVE_KEYS))if(this.held.has(code))directions.add(name);
    let x=Number(directions.has('right'))-Number(directions.has('left'));
    let y=Number(directions.has('down'))-Number(directions.has('up'));
    const length=Math.hypot(x,y)||1;
    return {x:x/length,y:y/length,moving:Boolean(x||y)};
  }
  endFrame(){this.justPressed.clear();}
}
