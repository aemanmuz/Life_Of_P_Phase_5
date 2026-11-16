"""Optional local visual smoke test. Uses in-memory HTML to avoid sandbox navigation restrictions."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text()
for sheet in ['main.css','hud.css','modals.css']:
 html=html.replace(f'<link rel="stylesheet" href="css/{sheet}" />',f'<style>{(root/"css"/sheet).read_text()}</style>')
# Remove the small loader; inject the generated bundle ourselves.
html=html[:html.index('  <script>\n    (function ()')]+'''</body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.add_script_tag(content=(root/'js/offline.bundle.js').read_text())
 page.wait_for_function('window.__lifeOfPReady === true')
 page.locator('[data-action="new-game"]').click();page.wait_for_timeout(100)
 assert page.evaluate('window.__lifeOfPGame.started')
 page.screenshot(path='/mnt/data/life-of-p-phase-4-world.png')
 page.keyboard.press('n');page.wait_for_timeout(90)
 assert page.locator('.nemesis-card').count()==4
 page.screenshot(path='/mnt/data/life-of-p-phase-4-nemesis.png')
 page.locator('[data-action="close-modal"]').click()
 page.evaluate('''() => {let g=window.__lifeOfPGame;let m=g.world.landmarks.find(x=>x.id==='vell');g.player.x=m.x;g.player.y=m.y;}''')
 page.keyboard.press('e');page.wait_for_timeout(50)
 assert page.locator('.dialogue-choice').count()==3
 page.screenshot(path='/mnt/data/life-of-p-phase-4-dialogue.png')
 page.locator('[data-action="dialogue:vell:appeal"]').click()
 assert page.evaluate('window.__lifeOfPGame.dialogue.flags.vell')=='appeal'
 assert not errors,errors
 print('Browser in-memory visual test passed: launch, 4 captains, dialogue interaction, rendering. Errors: 0.')
 browser.close()
