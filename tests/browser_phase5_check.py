"""Visual and integration playtest of the Phase 5 generated offline bundle."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
for sheet in ['main.css','hud.css','modals.css']:
    html=html.replace(f'<link rel="stylesheet" href="css/{sheet}" />',f'<style>{(root/"css"/sheet).read_text()}</style>')
html=html[:html.index('  <script>\n    (function ()')]+'''</body></html>'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    page.set_default_timeout(3500)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded')
    # In-memory page has an opaque origin; supply temporary storage for save/load tests.
    page.evaluate("""() => {const mem=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)}})}""")
    page.add_script_tag(content=(root/'js/offline.bundle.js').read_text())
    page.wait_for_function('window.__lifeOfPReady === true')
    page.locator('[data-action="new-game"]').click()
    page.wait_for_timeout(160)
    assert page.evaluate('window.__lifeOfPGame.started')
    page.screenshot(path='/mnt/data/life-of-p-phase-5-world.png')
    # Speed up the intro in test only, preserving real game gating.
    page.evaluate("window.__lifeOfPGame.questStep=2")
    page.keyboard.press('o')
    page.wait_for_timeout(120)
    assert page.locator('.story-sigil').count()==3
    page.screenshot(path='/mnt/data/life-of-p-phase-5-story.png')
    page.locator('[data-action="close-modal"]').click()
    page.evaluate("""() => {const g=window.__lifeOfPGame;const p=g.world.landmarks.find(e=>e.id==='convergence-altar');g.player.x=p.x;g.player.y=p.y;}""")
    page.keyboard.press('e')
    page.wait_for_timeout(60)
    assert page.locator('[data-action="story:alignment:hero"]').count()==1
    page.locator('[data-action="story:alignment:hero"]').click()
    assert page.evaluate("window.__lifeOfPGame.story.alignment")=='hero'
    page.locator('[data-action="close-modal"]').click()
    # Integration: boss death -> sigil, unique loot, saved ending.
    page.evaluate("""() => {const g=window.__lifeOfPGame;for(const kind of ['thorn-matriarch','drowned-herald','cinder-regent']){const e=g.enemies.find(e=>e.kind===kind);e.alive=false;e.health=0;g.onEnemyKilled(e);} }""")
    assert page.evaluate('window.__lifeOfPGame.story.sigils.length')==3
    page.keyboard.press('e')
    page.wait_for_timeout(100)
    page.screenshot(path='/mnt/data/life-of-p-phase-5-altar.png')
    page.locator('[data-action="story:finish"]').click()
    page.wait_for_timeout(120)
    assert page.evaluate('window.__lifeOfPGame.story.ending')=='hero'
    assert page.locator('#epilogue-overlay:not(.hidden)').count()==1
    page.screenshot(path='/mnt/data/life-of-p-phase-5-ending.png')
    print('Ending overlay passed',flush=True)
    page.locator('[data-action="close-epilogue"]').click()
    page.evaluate('window.__lifeOfPGame.save(false)')
    page.evaluate('window.__lifeOfPGame.mainMenu()')
    print('At main menu',flush=True)
    page.locator('[data-action="continue-game"]').click()
    print('Continue passed',flush=True)
    assert page.evaluate('window.__lifeOfPGame.story.ending')=='hero'
    # Check a second independent route.
    page.evaluate('window.__lifeOfPGame.mainMenu()')
    page.locator('[data-action="new-game"]').click()
    print('Second new game',flush=True)
    page.evaluate("""() => {let g=window.__lifeOfPGame;g.questStep=2;let m=g.world.landmarks.find(x=>x.id==='convergence-altar');g.player.x=m.x;g.player.y=m.y;}""")
    page.keyboard.press('e')
    page.locator('[data-action="story:alignment:civilian"]').click()
    page.locator('[data-action="close-modal"]').click()
    page.evaluate("""() => {let g=window.__lifeOfPGame;g.homeOwned=true;g.social.generation=2;}""")
    page.keyboard.press('e')
    page.locator('[data-action="story:finish"]').click()
    assert page.evaluate('window.__lifeOfPGame.story.ending')=='civilian'
    assert not errors,errors
    print('Phase 5 Chromium integration passed: title, story board, oath choice, 3 boss rewards, epilogue, save/continue, civilian ending. 0 page errors.')
    browser.close()
