/** Lightweight original enemy types for the Phase 2 combat sandbox. */
export const ENEMY_ARCHETYPES=Object.freeze({
  'ash-wanderer':{id:'ash-wanderer',name:'Ash Wanderer',maxHealth:48,damage:10,speed:64,reach:43,windup:.63,attackCooldown:1.4,aggro:210,posture:42,coinMin:8,coinMax:19,color:'#8f7772'},
  'hollow-stalker':{id:'hollow-stalker',name:'Hollow Stalker',maxHealth:68,damage:14,speed:92,reach:45,windup:.49,attackCooldown:1.22,aggro:245,posture:58,coinMin:13,coinMax:27,color:'#6f9490'},
  'thorn-matriarch':{id:'thorn-matriarch',name:'Thorn Matriarch',maxHealth:310,damage:20,speed:94,reach:70,windup:.73,attackCooldown:1.38,aggro:290,posture:125,coinMin:200,coinMax:250,color:'#68885c',elite:true},
  'drowned-herald':{id:'drowned-herald',name:'Drowned Herald',maxHealth:340,damage:24,speed:72,reach:81,windup:.88,attackCooldown:1.44,aggro:310,posture:150,coinMin:250,coinMax:290,color:'#598d9e',elite:true},
  'cinder-regent':{id:'cinder-regent',name:'Cinder Regent',maxHealth:425,damage:32,speed:85,reach:84,windup:.78,attackCooldown:1.25,aggro:350,posture:175,coinMin:340,coinMax:390,color:'#b35e48',elite:true},
  'ash-warden':{id:'ash-warden',name:'Ashen Warden',maxHealth:265,damage:23,speed:65,reach:66,windup:.85,attackCooldown:1.7,aggro:310,posture:125,coinMin:175,coinMax:210,color:'#b09a75',elite:true},
});
export const ENEMY_SPAWNS=[
  {kind:'ash-wanderer',tx:51,ty:45},{kind:'ash-wanderer',tx:47,ty:48},
  {kind:'hollow-stalker',tx:55,ty:52},{kind:'ash-wanderer',tx:62,ty:39},
  {kind:'hollow-stalker',tx:68,ty:36},{kind:'ash-wanderer',tx:42,ty:27},
  {kind:'hollow-stalker',tx:35,ty:30},{kind:'ash-wanderer',tx:49,ty:61},
  {kind:'ash-wanderer',tx:70,ty:25},{kind:'ash-warden',tx:77,ty:24},
  {kind:'thorn-matriarch',tx:26,ty:20},
  {kind:'drowned-herald',tx:41,ty:52},
  {kind:'cinder-regent',tx:82,ty:23},
];
