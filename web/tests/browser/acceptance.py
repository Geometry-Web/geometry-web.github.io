"""Run browser acceptance checks with a running Vite server and Playwright for Python.

Set GAME_BASE_URL to a running deployment and BROWSER_EXECUTABLE to a Chromium
executable if Playwright Chromium is not installed. Set GAME_SCREENSHOTS to
capture the menu and editor. Pass --dist PATH to serve a built bundle under a
GitHub Pages style subpath. Use GAME_CANVAS_FALLBACK=1 to exercise Canvas 2D. Test data stays inside an isolated browser profile.
"""
import base64
import json
import functools
import http.server
import shutil
import sys
import tempfile
import threading
import os
import re
import unittest
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


class BrowserAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path=os.getenv("BROWSER_EXECUTABLE"),
            args=["--enable-unsafe-swiftshader"],
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1280, "height": 720})
        if os.getenv("GAME_CANVAS_FALLBACK") == "1":
            self.context.add_init_script("""const getContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function(type, ...options) {
                    return type === 'webgl2' ? null : getContext.call(this, type, ...options);
                };""")
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.on("console", lambda message: self.errors.append(message.text)
                     if message.type == "error" else None)
        self.page.set_default_timeout(5500)
        self.page.goto(os.getenv("GAME_BASE_URL", "http://127.0.0.1:5173/"))
        expect(self.action("LEVEL EDITOR")).to_be_visible()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def action(self, label):
        return self.page.get_by_role("button", name=re.compile(label, re.IGNORECASE))

    def capture(self, name):
        destination = os.getenv("GAME_SCREENSHOTS")
        if destination:
            directory = Path(destination)
            directory.mkdir(parents=True, exist_ok=True)
            self.page.screenshot(path=directory / f"{name}.png")

    def test_responsive_menu(self):
        for name, width, height in [("desktop", 1280, 720), ("mobile", 390, 844), ("narrow", 320, 568)]:
            self.page.set_viewport_size({"width": width, "height": height})
            self.capture(name)
            for button in self.page.get_by_role("button").all():
                box = button.bounding_box()
                self.assertGreaterEqual(box["x"], 0)
                self.assertLessEqual(box["x"] + box["width"], width + 1)
                self.assertGreaterEqual(box["y"], 0)
                self.assertLessEqual(box["y"] + box["height"], height + 1)
        self.action("SETTINGS").click()
        self.assertGreaterEqual(self.page.get_by_role("slider").count(), 2)

    def test_editor_save_reload_and_play(self):
        self.action("LEVEL EDITOR").click()
        self.capture("editor")
        self.assertEqual(self.page.evaluate("document.elementFromPoint(750, 260).tagName"), "CANVAS")
        self.page.mouse.click(750, 260)
        self.page.mouse.click(810, 275)
        self.action("^UNDO$").click()
        self.action("^SAVE$").click()
        self.page.wait_for_function("""async () => {
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open('gdr-storage');
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            if (!db.objectStoreNames.contains('levels')) { db.close(); return false; }
            const rows = await new Promise((resolve, reject) => {
                const req = db.transaction('levels').objectStore('levels').getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            db.close();
            return rows.some(level => level.objects.length === 1);
        }""")
        self.page.reload()
        self.action("PLAY$").click()
        self.action("My Level").first.click()
        expect(self.page.get_by_text("LEVEL COMPLETE!", exact=True)).to_be_visible(timeout=15000)
        self.capture("completed")
        self.action("^Menu$").click()
        self.action("PLAY$").click()
        self.action("^Edit My Level$").click()
        original = self.export()
        self.action("^Playtest$").click()
        expect(self.action("^Return to editor$")).to_be_visible()
        self.action("^Return to editor$").click()
        self.assertEqual(self.export(), original)

    def export(self):
        with self.page.expect_download() as event:
            self.action("^Export$").click()
        return json.loads(Path(event.value.path()).read_text(encoding="utf-8"))

    def test_edit_transform_history_and_exchange(self):
        self.action("LEVEL EDITOR").click()
        self.page.get_by_label("Level name").fill("Relay")
        self.page.get_by_label("Placement tool").select_option(label="Block")
        self.page.mouse.click(720, 260)
        for label, value in [("rotation", "45"), ("scale", "2"), ("group", "7")]:
            field = self.page.get_by_label(label, exact=True)
            field.fill(value)
            field.press("Tab")
        self.action("^Copy$").click()
        self.action("^Paste$").click()
        self.action("^Undo$").click()
        self.action("^Redo$").click()
        self.page.get_by_label("Placement tool").select_option(label="Move Group")
        self.page.mouse.click(650, 390)
        self.page.get_by_label("target", exact=True).fill("7")
        self.page.get_by_label("dx", exact=True).fill("90")
        self.page.get_by_label("dx", exact=True).press("Tab")
        data = self.export()
        self.assertEqual(data["name"], "Relay")
        self.assertEqual(len(data["objects"]), 3)
        first, copy, trigger = data["objects"]
        self.assertEqual((first["rotation"],first["scale"],first["groups"]), (45, 2, [7]))
        self.assertEqual(copy["x"], first["x"] + 30)
        self.assertEqual(trigger["props"], {"target": 7, "dx": 90})
        self.page.once("dialog", lambda dialog: dialog.accept())
        self.action("^New$").click()
        self.page.locator('input[type=file]').set_input_files({
            "name": "relay.json", "mimeType": "application/json",
            "buffer": json.dumps(data).encode(),
        })
        expect(self.page.get_by_label("Level name")).to_have_value("Relay")
        self.assertEqual(self.export(), data)

    def test_editor_world_grid(self):
        self.action("LEVEL EDITOR").click()
        png = base64.b64encode(self.page.screenshot()).decode("ascii")
        changes = self.page.evaluate("""async (data) => {
            const bitmap = new Image();
            bitmap.src = "data:image/png;base64," + data;
            await bitmap.decode();
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(bitmap, 0, 0);
            // Every vertical grid line should have its own world-space origin.
            const pixels = ctx.getImageData(30, 170, 900, 1).data;
            let count = 0;
            for (let i = 4; i < pixels.length; i += 4) {
                if (Math.abs(pixels[i + 2] - pixels[i - 2]) > 3) count++;
            }
            return count;
        }""", png)
        self.assertGreater(changes, 18, "Grid geometry must occupy multiple world coordinates.")

    def test_practice_checkpoint_respawn(self):
        self.action("PLAY$").click()
        self.action("Warmup").click()
        self.page.keyboard.press("Escape")
        self.action("^PRACTICE MODE$").click()
        self.action("^RESUME$").click()
        self.page.wait_for_function("parseInt(document.querySelector('.pct').textContent) >= 12")
        self.page.keyboard.press("z")
        expect(self.page.get_by_text("Checkpoint saved", exact=True)).to_be_visible()
        expect(self.page.get_by_text("CRASH!", exact=True)).to_be_visible()
        expect(self.page.get_by_text("CRASH!", exact=True)).to_be_hidden()
        progress = int(self.page.locator(".pct").inner_text().rstrip("%"))
        self.assertGreaterEqual(progress, 12, "Practice restart must preserve checkpoint progress.")
        self.assertLess(progress, 34, "Checkpoint respawn must rewind progress.")

    def test_workshop_selection_persists(self):
        self.action("ICON WORKSHOP").click()
        self.action("^Diamond$").click()
        expect(self.page.locator(".icon-preview")).to_have_text("Diamond")
        self.page.reload()
        self.action("ICON WORKSHOP").click()
        expect(self.page.locator(".icon-preview")).to_have_text("Diamond")

    def test_air_relay_mechanics(self):
        self.action("LEVEL EDITOR").click()
        fixture = Path(__file__).with_name("air-relay.json")
        self.page.locator("input[type=file]").set_input_files(fixture)
        expect(self.page.get_by_label("Level name")).to_have_value("Air Relay")

        # Observe the real SFX frequency ramps. The running game and its clock
        # keep their normal inputs, timing, collisions, and audio scheduling.
        self.page.evaluate("""() => {
            window.effectSlides = [];
            const original = AudioParam.prototype.exponentialRampToValueAtTime;
            AudioParam.prototype.exponentialRampToValueAtTime = function(value, endTime) {
                if (value > 1) window.effectSlides.push(value);
                return original.call(this, value, endTime);
            };
        }""")
        self.action("^Playtest$").click()
        crash = self.page.get_by_text("CRASH!", exact=True)
        expect(crash).to_be_visible()
        expect(crash).to_be_hidden()
        self.page.evaluate("window.effectSlides.length = 0")

        # Jump as the HUD crosses 23%, then hit the airborne orb at 30%.
        for percent in [23, 30]:
            self.page.wait_for_function("p => parseInt(document.querySelector('.pct').textContent) >= p",
                                        arg=percent)
            self.page.keyboard.press("Space")
        expect(self.page.get_by_text("LEVEL COMPLETE!", exact=True)).to_be_visible()
        expect(self.page.get_by_text(re.compile("3/3 coins"))).to_be_visible()
        # Jump, orb, pad, ship portal, inverted-gravity portal, in order.
        self.assertEqual(self.page.evaluate("window.effectSlides"), [720, 990, 1040, 1200, 1200])
        self.assertEqual(self.page.locator(".pct").inner_text(), "100%")
        # At the finish only the player is in the central half of the screen.
        # The ship mode has a magenta fuselage, distinct from the cyan cube.
        png = base64.b64encode(self.page.screenshot()).decode("ascii")
        ship_pixels = self.page.evaluate("""async data => {
            const bitmap = new Image();
            bitmap.src = "data:image/png;base64," + data;
            await bitmap.decode();
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(bitmap, 0, 0);
            const pixels = ctx.getImageData(460, 0, 450, canvas.height).data;
            let count = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i] > 240 && pixels[i+1] < 110 && pixels[i+2] > 200) count++;
            }
            return count;
        }""", png)
        self.assertGreater(ship_pixels, 90, "The finished player should render in ship mode.")

    def test_gameplay_and_pause(self):
        self.action("PLAY$").click()
        self.action("Warmup").click()
        self.page.keyboard.press("Space")
        self.page.keyboard.press("Escape")
        expect(self.action("^RESUME$")).to_be_visible()
        before = self.page.locator(".pct").inner_text()
        self.page.wait_for_timeout(200)
        self.assertEqual(self.page.locator(".pct").inner_text(), before)
        self.action("^RESUME$").click()
        expect(self.action("^RESUME$")).to_be_hidden()
        self.capture("playing")


if __name__ == "__main__":
    if "--dist" in sys.argv:
        index = sys.argv.index("--dist")
        dist = Path(sys.argv[index + 1]).resolve()
        del sys.argv[index:index + 2]

        class StaticHandler(http.server.SimpleHTTPRequestHandler):
            def log_request(self, code="-", size="-"):
                if isinstance(code, int) and code >= 400:
                    super().log_request(code, size)

        with tempfile.TemporaryDirectory() as root:
            shutil.copytree(dist, Path(root) / "geometry-web")
            handler = functools.partial(StaticHandler, directory=root)
            with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
                threading.Thread(target=server.serve_forever, daemon=True).start()
                os.environ["GAME_BASE_URL"] = f"http://127.0.0.1:{server.server_port}/geometry-web/"
                try:
                    unittest.main(verbosity=2)
                finally:
                    server.shutdown()
    else:
        unittest.main(verbosity=2)
