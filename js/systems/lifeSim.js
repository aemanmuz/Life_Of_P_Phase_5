/** Phase 3 calendar: 7 playable days per season, 4 seasons per year. */
export const SEASONS=Object.freeze(['Spring','Summer','Autumn','Winter']);
export const DAYS_PER_SEASON=7;
export class WorldClock {
  constructor(){this.minutes=8*60+20;this.day=1;}
  update(dt){
    this.minutes+=dt*3.2;let elapsed=0;
    while(this.minutes>=1440){this.minutes-=1440;this.day++;elapsed++;}
    return elapsed;
  }
  nextMorning(){this.minutes=7*60;this.day++;return 1;}
  get year(){return Math.floor((this.day-1)/(DAYS_PER_SEASON*4))+1;}
  get season(){return SEASONS[Math.floor((this.day-1)/DAYS_PER_SEASON)%4];}
  get seasonDay(){return ((this.day-1)%DAYS_PER_SEASON)+1;}
  get hour(){return Math.floor(this.minutes/60)%24;}
  get formatted(){const hour=this.hour;const minute=Math.floor(this.minutes%60);return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;}
  get period(){const h=this.hour;return h>=5&&h<11?'MORNING':h>=11&&h<16?'AFTERNOON':h>=16&&h<20?'EVENING':'NIGHT';}
  get weather(){return (this.day*17+this.year*3)%9<3?'RAIN':'CLEAR';}
  get lightLevel(){
    const h=this.minutes/60;
    if(h>=7&&h<17.5)return 0;
    if(h>=17.5&&h<21)return (h-17.5)/3.5*.75;
    if(h>=5&&h<7)return (7-h)/2*.75;
    return .75;
  }
}
