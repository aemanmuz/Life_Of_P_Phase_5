/** Phase 1 world: deterministic 96 × 72 tile world, terrain, obstacles and landmarks. */
export const TILE = 32;
export const TERRAIN = Object.freeze({ MEADOW:0, GRASS:1, PATH:2, WATER:3, SHORE:4, FIELD:5, STONE:6, FLOWERS:7 });

function randomAt(x, y, salt = 0) {
  // Stable pseudo-random value based on coordinates. Same world every reload.
  let n = (Math.imul(x + 17, 374761393) ^ Math.imul(y + 97, 668265263) ^ Math.imul(salt + 31, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const distance = (x1,y1,x2,y2) => Math.hypot(x1-x2,y1-y2);

export class World {
  constructor() {
    this.width = 96;
    this.height = 72;
    this.pixelWidth = this.width * TILE;
    this.pixelHeight = this.height * TILE;
    this.spawn = { x: 49 * TILE, y: 37 * TILE };
    this.tiles = Array.from({length:this.height}, (_,y) => Array.from({length:this.width},(_,x)=>this.terrainAt(x,y)));
    this.objects = [];
    this.landmarks = [
      {id:'vell',type:'npc',x:54*TILE,y:37*TILE,name:'Vell, the Waykeeper',prompt:'Speak with Vell',text:'“Every road was once a stranger’s path. The waystone to the south is older than the Convergence itself. Go see what it remembers.”'},
      {id:'sign',type:'sign',x:47*TILE,y:34*TILE,name:'Crossroads Signpost',prompt:'Read the sign',text:'NORTH — The Forgotten Grove. EAST — The Fallen Reach. SOUTH — Old Waystone. WEST — Silvermere Pond.'},
      {id:'stone',type:'stone',x:48*TILE,y:52*TILE,name:'The Old Waystone',prompt:'Inspect the waystone',text:'The stone is warm to your touch. An ancient ember lights beneath its surface; for a moment, you sense that this world remembers you.'},
      {id:'farm',type:'sign',x:39*TILE,y:39*TILE,name:'The Fallows',prompt:'View farming guide',text:'The Fallows are open. Walk onto an empty farm plot and press E to till, plant, water or harvest.'},
      {id:'cottage',type:'sign',x:40*TILE,y:35*TILE,name:'The Fallow Cottage',prompt:'Visit your cottage',text:'An empty cottage awaits a new family.'},
      {id:'herb-patch',type:'herb',x:45*TILE,y:44*TILE,name:'Moonmint Herb Patch',prompt:'Gather herbs',text:'Soft blue leaves grow beside the fields.'},
      {id:'forge',type:'sign',x:56*TILE,y:43*TILE,name:'The Village Forge',prompt:'Craft items',text:'A smithing bench and a stove are ready for use.'},
      {id:'ruins',type:'stone',x:77*TILE,y:23*TILE,name:'The Ruined Sanctum',prompt:'Inspect the ruins',text:'Cracked symbols mark an age before the sky broke. Future phases will reveal what stirs beneath these stones.'},
      {id:'convergence-altar',type:'stone',x:52*TILE,y:27*TILE,name:'The Convergence Altar',prompt:'Choose your destiny',text:'Three sigils float in an unwritten circle.'},
      {id:'elderbough',type:'stone',x:26*TILE,y:19*TILE,name:'The Elderbough',prompt:'Inspect the heartwood',text:'The ancient roots whisper of a lost verdant sigil.'},
      {id:'silvermere-ward',type:'stone',x:41*TILE,y:51*TILE,name:'The Silvermere Ward',prompt:'Inspect the drowned bell',text:'The bell that once guarded this shore has fallen silent.'},
      {id:'cinder-gate',type:'stone',x:82*TILE,y:22*TILE,name:'The Cinder Gate',prompt:'Inspect the cinder rift',text:'A gate of searing ash yawns beneath the broken sky.'},
      {id:'fire',type:'fire',x:51*TILE,y:40*TILE,name:'The Crossroads Campfire',prompt:'Rest by the fire',text:'The embers glow. For a little while, the road beyond the village feels less uncertain.'},
    ];
    this.generateObjects();
  }

  terrainAt(x,y) {
    const r = randomAt(x,y);
    let type = r > .95 ? TERRAIN.FLOWERS : (r > .72 ? TERRAIN.GRASS : TERRAIN.MEADOW);
    // Ancient road crossing the entire valley.
    const crossY = 36 + Math.sin(x*.095)*1.25;
    const crossX = 48 + Math.sin(y*.13)*1.15;
    if (Math.abs(y-crossY)<1.3 || Math.abs(x-crossX)<1.3) type = TERRAIN.PATH;
    // Clear out a welcoming village at the crossroads.
    if (distance(x,y,49,36)<9.4) type = r>.55 ? TERRAIN.PATH : TERRAIN.MEADOW;
    // An abandoned northern stone site.
    const ruin = Math.hypot((x-77)*.95,(y-21)*1.1);
    if (ruin<7.3) type = r>.22 ? TERRAIN.STONE : TERRAIN.MEADOW;
    // Farm plots south-west of village.
    if (x>=35 && x<=42 && y>=41 && y<=46) type = TERRAIN.FIELD;
    // Silvermere pond (shore edge and deep water).
    const pond = Math.pow((x-28)/10.1,2)+Math.pow((y-52)/6.4,2);
    if (pond<1.23) type = TERRAIN.SHORE;
    if (pond<.87) type = TERRAIN.WATER;
    // A few rocky northern cliff edges.
    if ((y<6 || y>68) && randomAt(x, y, 7)>.24) type = TERRAIN.STONE;
    return type;
  }

  generateObjects() {
    for(let y=2;y<this.height-2;y++) for(let x=2;x<this.width-2;x++) {
      const terrain=this.tiles[y][x];
      if ([TERRAIN.WATER,TERRAIN.PATH,TERRAIN.FIELD,TERRAIN.SHORE].includes(terrain)) continue;
      if (distance(x,y,49,37)<11 || distance(x,y,77,23)<7.7 || distance(x,y,26,19)<6 || distance(x,y,38,51)<5 || distance(x,y,82,22)<4.5) continue;
      if (this.landmarks.some(p=>distance(x,y,p.x/TILE,p.y/TILE)<2.8)) continue;
      const r=randomAt(x,y,91);
      const jitterX=(randomAt(x,y,93)-.5)*10;
      const jitterY=(randomAt(x,y,94)-.5)*8;
      if (r<.077) this.objects.push({kind:'tree',x:x*TILE+16+jitterX,y:y*TILE+16+jitterY,radius:12,solid:true,variant:randomAt(x,y,90)});
      else if(r<.091) this.objects.push({kind:'rock',x:x*TILE+16+jitterX,y:y*TILE+16+jitterY,radius:11,solid:true,variant:randomAt(x,y,80)});
      else if(r<.13) this.objects.push({kind:'bush',x:x*TILE+16+jitterX,y:y*TILE+16+jitterY,radius:0,solid:false});
    }
    // Structures are circles/rectangles for collisions, sprites drawn in canvas.js.
    this.objects.push(
      {kind:'house',x:42*TILE,y:30*TILE,w:5*TILE,h:4*TILE,solid:true,variant:0},
      {kind:'house',x:60*TILE,y:30*TILE,w:5*TILE,h:4*TILE,solid:true,variant:1},
      {kind:'house',x:58*TILE,y:43*TILE,w:4*TILE,h:3*TILE,solid:true,variant:2},
      {kind:'well',x:55*TILE,y:33*TILE,radius:17,solid:true},
      {kind:'broken-pillar',x:75*TILE,y:19*TILE,radius:12,solid:true},
      {kind:'broken-pillar',x:80*TILE,y:20*TILE,radius:12,solid:true},
      {kind:'broken-pillar',x:79*TILE,y:26*TILE,radius:12,solid:true},
    );
  }

  isBlocked(x,y,radius=11) {
    if(x<radius || y<radius || x>this.pixelWidth-radius || y>this.pixelHeight-radius) return true;
    // Check tile corners + cardinal points to avoid cutting across lake edges.
    for(const [ox,oy] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius],[radius*.7,radius*.7],[-radius*.7,-radius*.7],[radius*.7,-radius*.7],[-radius*.7,radius*.7]]) {
      const tx=Math.floor((x+ox)/TILE), ty=Math.floor((y+oy)/TILE);
      if(this.tiles[ty]?.[tx]===TERRAIN.WATER) return true;
    }
    for(const obj of this.objects) {
      if(!obj.solid) continue;
      if(obj.w) {
        // Buildings use x/y as top-left position.
        const closestX=Math.max(obj.x,Math.min(x,obj.x+obj.w));
        const closestY=Math.max(obj.y,Math.min(y,obj.y+obj.h));
        if(distance(x,y,closestX,closestY)<radius) return true;
      } else if(distance(x,y,obj.x,obj.y)<radius+obj.radius*.8) return true;
    }
    return false;
  }

  getNearby(x,y,maxDistance=70) {
    let result=null, best=maxDistance;
    for(const point of this.landmarks){const d=distance(x,y,point.x,point.y);if(d<best){best=d;result=point;}}
    return result;
  }
  getZone(x,y) {
    if(distance(x/TILE,y/TILE,49,36)<11) return 'WAYFARER’S REST';
    if(distance(x/TILE,y/TILE,28,52)<14) return 'SILVERMERE';
    if(distance(x/TILE,y/TILE,77,21)<11) return 'FALLEN REACH';
    if(x/TILE<38 && y/TILE<32) return 'THE FORGOTTEN GROVE';
    return 'THE ASHEN VERGE';
  }
}
