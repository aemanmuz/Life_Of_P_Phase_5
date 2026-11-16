# LIFE OF P — Phase 5: The Convergence of Ashes (v0.5.0)

A playable, original-world **2D top-down action-RPG and generational life-simulation sandbox** built with **HTML5 Canvas, CSS3, and vanilla JavaScript (ES modules)**. Phase 5 adds a story arc, three new major bosses, Hero/Villain/Civilian endings, dynamic world events, synth-based ambient sound, portable save backups and a polished ending screen, while preserving Phases 1–4.

The larger multi-franchise crossover described in the early design proposal is conceptual and **is not included in this distributable game**. This prototype uses original characters, items, locations and writing.

## Start the game

1. Extract the ZIP, then open the `life-of-p` folder in **VS Code**.
2. Right-click `index.html` → **Open with Live Server**. Alternately, upload the **contents** of `life-of-p` into the root of your existing GitHub Pages repository and publish.
3. Open the page and click **BEGIN YOUR JOURNEY**, or **CONTINUE JOURNEY** to load your existing progress.
4. Complete the introductory waystone quest (find the stone south of the crossroads, then return to Vell). The Phase 5 storyline unlocks when `questStep` reaches 2.
5. Press **O** to open the Convergence Chronicle. Visit the **Convergence Altar** north of the village to pick a permanent oath.

The game also supports a `file://` fallback through `js/offline.bundle.js`, built from the modular files. For development use Live Server or GitHub Pages.

**Updating your GitHub game:** Back up custom edits, replace Phase 4 repo files with all Phase 5 files, commit, let GitHub Pages deploy, then hard-refresh (**Ctrl + Shift + R**). Keep the same domain and repository path to retain the browser's existing saved progress.

## Phase 5 — Story and branching destinies

The fictional **Convergence of Ashes** left three ancient sigils scattered across the Ashen Verge. The player, an Unwritten Soul called P, can choose a personal destiny:

| Alignment | Gameplay perk | Ending condition | Ending reward |
| --- | --- | --- | --- |
| **Paragon / Hero** | +3 protection | Defeat all three story bosses and return to the Altar | Dawnward Regalia (Legendary armor), 500 gold, 5 Ember Flasks |
| **Usurper / Villain** | +5 weapon damage | Defeat all three story bosses and return to the Altar | Eclipse Sabre (Legendary weapon), 500 gold, 5 Ember Flasks |
| **Hearthkeeper / Civilian** | +15% stamina regeneration | Claim Fallow Cottage, marry, raise a grown heir, retire into generation 2, and return to the Altar | Hearthloom Coat (Epic armor), 5 Field Stews, 150 gold |

An alignment is **permanent per save**. The three endings have different conclusions and rewards; all three leave the game world playable after the ending. Hero and Villain share the same three boss objectives, but have different buffs, story conclusions and equipment. The Civilian ending is achievable without fighting a story boss.

**New story encounters and boss rewards**

| Location | Boss | Story sigil | Legendary boss drop |
| --- | --- | --- | --- |
| Forgotten Grove, northwest | Thorn Matriarch | Verdant Sigil | Verdant Oath (weapon) |
| Silvermere shore, west | Drowned Herald | Tidal Sigil | Tidebound Mail (armor) |
| Fallen Reach, northeast | Cinder Regent | Cinder Sigil | Cinderbrand (weapon) |

Boss health, damage, speed and telegraphs differ; all three bosses **enrage** as their HP falls. The original **Ashen Warden** boss from Phase 2 remains in the same region, with the Crownless Edge drop. Defeating a new story boss awards its story sigil immediately (even before you select an alignment), and the unique Legendary weapon/armor appears as a nearby pickup. Press **E** near loot to claim it.

**Story tracker:** The journal and HUD update with an objective for the current sigil. The large map/minimap show an objective ring. Press **O** to view sigil progress, alignment, world event, and your story chronicle. Visit the marked story locations and press **E** to inspect them. All decisions and events persist in the browser save.

## Phase 5 — Daily world events

The world changes on an eight-day repeating cycle, and each day has a deterministic effect:

- **Quiet Skies:** ordinary conditions.
- **Ashfall:** stamina regenerates 25% more slowly, with drifting ash on-screen.
- **Eclipse of Ruin:** enemy damage increases 20%, with ominous lighting.
- **Verdant Bloom:** stamina regenerates 30% faster.

Events change when a new day starts (naturally or by sleeping). The HUD displays the current event.

## Phase 5 — Dynamic original audio

Press **♪ Sound OFF** in the hotbar to enable audio. Sound starts **muted by default**, respecting browser autoplay restrictions. The game synthesizes original atmospheric notes whose mood changes near bosses and in dangerous regions, plus gentle UI, attacks, dodge, parry, pickup and victory sounds. All audio is generated with Web Audio; the game needs no external audio files. You can turn sound off at any time. If the browser does not support Web Audio, gameplay still works silently.

## Gameplay controls

| Control | Action |
| --- | --- |
| WASD / arrow keys | Walk |
| Hold Shift | Sprint |
| Space | Dodge with invulnerability frames |
| F / left click | Light attack |
| R / right click | Heavy attack |
| Q | Timed parry |
| E | Interact, trade, tend farm, inspect altar or pick up loot |
| **O** | **Convergence story / destinies / sigils** |
| N | Nemesis board: captain history, promotions and domination |
| I | Inventory: consumables, weapons, armor, equipment |
| L | Life-sim: seasons, farming, villagers, relationships, cottage, heirs |
| C | Crafting |
| J | Quest journal |
| M | World map |
| H | Help / controls |
| Escape | Pause / close dialog |

The game includes existing on-screen touch controls from Phase 2; the new story and sound buttons are in the hotbar.

## Saving, importing and exporting

- The **existing browser storage key** is preserved: `life-of-p-phase1-v1`.
- Previous **Phase 1, 2, 3 and 4 saves migrate to Phase 5**; they keep compatible inventory, story intro progress, equipment, farm, relationships, and Nemesis/dialogue data. New story state starts fresh for older saves. Phase 5 saves are version 5.
- The game autosaves approximately every **30 seconds**, and immediately after major story milestones, domination, dialogue choices and legacy retirement.
- In the **Pause menu**, select **EXPORT SAVE BACKUP (.JSON)** to download a portable save file. Select **IMPORT SAVE BACKUP** to replace the browser's current save, then return to the title screen and press **CONTINUE JOURNEY** to load the imported save. **Import replaces your current save**; export it first if you want a backup.
- Local storage is associated with the exact website origin; **GitHub Pages does not automatically synchronize progress between devices**. Use the export/import controls to transfer a save. Clearing site data can delete your progress.

## Project layout

```text
life-of-p/
├── index.html
├── README.md
├── package.json
├── css/
│   ├── main.css
│   ├── hud.css
│   └── modals.css
├── js/
│   ├── main.js                  # Main game controller
│   ├── offline.bundle.js        # Generated classic JS for file:// fallback
│   ├── engine/
│   │   ├── world.js             # World layout and new landmarks
│   │   ├── canvas.js            # Rendering and visual effects
│   │   ├── input.js
│   │   └── saveSystem.js        # V5 persistence and JSON import/export
│   ├── data/
│   │   ├── enemies.js           # New bosses
│   │   ├── items.js             # Legendary / ending equipment
│   │   ├── quests.js
│   │   ├── npcs.js
│   │   └── story.js             # Original lore, sigils, path endings
│   ├── systems/
│   │   ├── combat.js
│   │   ├── enemyAI.js
│   │   ├── loot.js
│   │   ├── nemesis.js
│   │   ├── dialogue.js
│   │   ├── farming.js
│   │   ├── crafting.js
│   │   ├── lifeSim.js
│   │   ├── relationships.js
│   │   ├── story.js             # Choice, sigils, endings
│   │   ├── worldEvents.js       # Day-based environmental modifiers
│   │   └── audio.js             # Web Audio synthesizer
│   └── ui/
│       ├── hudUI.js
│       ├── inventoryUI.js
│       ├── lifeUI.js
│       ├── nemesisUI.js
│       └── storyUI.js           # Chronicle, Altar, epilogue
├── assets/                      # Favicon and reserved folders
├── tests/                       # Phase 1–5 regression tests and browser checks
└── tools/
    └── build-offline.mjs
```

## Developer commands

Node.js 20+ recommended; **no npm dependencies** are needed for the core project.

```bash
npm test
npm run build:offline
```

The test suite contains **48 automated tests** across Phases 1–5, including a generated JavaScript bundle smoke test. `tests/browser_phase5_check.py` is an optional Chromium/Playwright visual and integration check; it verifies story transitions, boss rewards, a completed ending, save/continue and Civilian completion. Python Playwright and a Chromium executable are needed only for that optional test.

**Current scope and limitations:** This is a compact, fully playable **single-region prototype** with a designed quest arc, not a fully authored hundreds-of-hours commercial RPG. The Nemesis hierarchy remains four captains; farming and generational inheritance are simplified. Major bosses use a common AI foundation with different stats and enraged phases; not fully bespoke animation trees. There is no online multiplayer, cloud database, voice acting or third-party franchise crossover content. Asset folders are reserved for future art and audio.
