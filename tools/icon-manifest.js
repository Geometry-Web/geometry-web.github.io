/* Build the Icon Kit manifest (res/gd/icons/manifest.json) from GD's loose icon
 * atlases, and optionally copy the PNGs the game loads at runtime.
 *
 * GD 2.2 keeps player icons outside the game sheets: every icon is its own tiny
 * atlas, Resources/icons/<family>_<n>.plist + .png, holding the icon body, its
 * detail layer and its glow side by side. The web build only shipped
 * GJ_GameSheetIcons — a truncated rip with 249 cubes and 79 ships — so the Icon
 * Kit ran out of icons. This tool reads the real resources folder, picks the
 * icon body out of each atlas and records its rect, which is all the runtime
 * needs: one PNG per icon, no per-icon plist parse on the main thread.
 *
 * Usage (run from web/):
 *   node tools/icon-manifest.js ../gdstuffs/Resources/icons \
 *        --out res/gd/icons/manifest.json --copy res/gd/icons
 *
 * --out  where to write the manifest (default res/gd/icons/manifest.json)
 * --copy also copy every SD atlas PNG into that folder
 *
 * Manifest shape:
 *   { "families": { "player": 484, ... },
 *     "frames":   { "player_01": [x, y, w, h], ... } }   // source-pixel rect
 * The rect is the plist's textureRect (y down from the top of the atlas), i.e.
 * exactly what cc.SpriteFrame.createWithTexture() expects.
 */
const fs = require("fs");
const path = require("path");

// Icon-Kit families, in the order the game shows them. The jetpack tab is the
// only one whose file prefix ("jetpack") differs from its pool name ("pack").
const FAMILIES = ["player", "ship", "player_ball", "bird", "dart",
                  "robot", "spider", "swing", "jetpack"];

function usage(msg) {
  if (msg) console.error(msg);
  console.error("usage: node tools/icon-manifest.js <iconsSrcDir> " +
                "[--out <manifest.json>] [--copy <destDir>]");
  process.exit(2);
}

/* Every frame of one atlas plist: "<name>.png" -> [x, y, w, h, rotated].
 *
 * TexturePacker format 3 stores the *packed* region in textureRect, so a rotated
 * frame has its width and height swapped there; spriteSize is the size the
 * sprite is drawn at. cc.SpriteFrameCache overrides the rect size with
 * spriteSize for exactly that reason, and this reader does the same, otherwise
 * rotated icons get a transposed slice of the atlas. */
function readFrames(xml) {
  const frames = {};
  const key = /<key>([^<]+\.png)<\/key>/g;
  let m;
  while ((m = key.exec(xml))) {
    // The frame's own <dict> closes before the next key; aliases are <array/>.
    const block = xml.slice(m.index, xml.indexOf("</dict>", m.index));
    const tex = /<key>textureRect<\/key>\s*<string>\{\{([-\d.]+),([-\d.]+)\},\{([-\d.]+),([-\d.]+)\}\}<\/string>/.exec(block);
    if (!tex) continue;
    const size = /<key>spriteSize<\/key>\s*<string>\{([-\d.]+),([-\d.]+)\}<\/string>/.exec(block);
    const rotated = /<key>textureRotated<\/key>\s*<(true|false|string)/i.exec(block);
    frames[m[1]] = [
      Number(tex[1]),
      Number(tex[2]),
      size ? Number(size[1]) : Number(tex[3]),
      size ? Number(size[2]) : Number(tex[4]),
      rotated && rotated[1].toLowerCase() === "true" ? 1 : 0
    ];
  }
  return frames;
}

/* Name of the icon body inside an atlas, e.g. "player_07_001.png" for
 * "player_07". Detail (_2_, _3_) and glow layers are longer names, so the
 * shortest stripped candidate that starts with the base is the body. */
function bodyFrame(base, frames) {
  let best = null;
  for (const name of Object.keys(frames)) {
    if (name.indexOf(base) !== 0) continue;
    const stripped = name.replace(/_001\.png$/, "");
    if (stripped !== base && !/_\d+$/.test(stripped)) continue;   // glow / detail
    if (!best || stripped.length < best.length) best = stripped;
  }
  return best ? best + "_001.png" : null;
}

/* PNG pixel size from the IHDR chunk (no image library needed). */
function pngSize(file) {
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(24);
  try {
    fs.readSync(fd, buf, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
let src = null, outPath = "res/gd/icons/manifest.json", copyDir = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") outPath = argv[++i];
  else if (argv[i] === "--copy") copyDir = argv[++i];
  else src = argv[i];
}
if (!src) usage("missing <iconsSrcDir>");
if (!fs.existsSync(src)) usage("no such folder: " + src);

// ------------------------------------------------------------------- gather
const files = fs.readdirSync(src);
const sdPngs = files.filter(f => /\.png$/i.test(f) && !/-(hd|uhd)\.png$/i.test(f));
const families = {};
const frames = {};
const problems = [];

for (const family of FAMILIES) {
  // "<family>_01.plist", "<family>_109.plist", ... (SD only). The regex is
  // anchored so "player_ball_07" is not mistaken for a "player" icon.
  const re = new RegExp("^" + family + "_(\\d+)\\.plist$");
  const icons = files
    .map(f => ({ file: f, m: re.exec(f) }))
    .filter(o => o.m)
    .map(o => ({ number: Number(o.m[1]), plist: o.file }))
    .sort((a, b) => a.number - b.number);

  if (!icons.length) { problems.push(family + ": no atlases"); continue; }

  const missing = [];
  for (let n = 1; n <= icons[icons.length - 1].number; n++) {
    if (!icons.some(icon => icon.number === n)) missing.push(n);
  }

  for (const icon of icons) {
    const base = family + "_" + String(icon.number).padStart(2, "0");
    const xml = fs.readFileSync(path.join(src, icon.plist), "utf8");
    const atlas = readFrames(xml);
    const body = bodyFrame(base, atlas);
    if (!body) { problems.push(base + ": no icon body frame"); continue; }

    // Rotated frames are packed transposed, so the packed region is h x w.
    const rect = atlas[body];
    const packedW = rect[4] ? rect[3] : rect[2];
    const packedH = rect[4] ? rect[2] : rect[3];
    const png = path.join(src, base + ".png");
    const size = fs.existsSync(png) ? pngSize(png) : null;
    if (!size) { problems.push(base + ": no " + base + ".png"); continue; }
    if (rect[0] + packedW > size.width || rect[1] + packedH > size.height) {
      problems.push(base + ": frame " + JSON.stringify(rect) + " outside " +
                    size.width + "x" + size.height + " atlas");
      continue;
    }
    frames[base] = rect;
  }

  // Icon 0 is GD's "no icon" placeholder and never shows up in the Icon Kit.
  families[family] = { count: icons.length - (icons[0].number === 0 ? 1 : 0),
                       missing: missing };
}

if (problems.length) {
  console.error("problems:\n  " + problems.join("\n  "));
  process.exit(1);
}

// -------------------------------------------------------------------- write
const body = Object.keys(frames).map(name =>
  '    "' + name + '": [' + frames[name].join(", ") + "]"
).join(",\n");

const json = '{\n' +
  '  "families": {\n' +
  Object.keys(families).map(name =>
    '    "' + name + '": { "count": ' + families[name].count +
    ', "missing": [' + families[name].missing.join(", ") + "] }"
  ).join(",\n") + '\n  },\n' +
  '  "frames": {\n' + body + '\n  }\n' +
  '}\n';

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, json);
console.log("wrote " + outPath + " (" + Object.keys(frames).length + " icons)");
for (const family of Object.keys(families)) {
  const f = families[family];
  console.log("  " + family + ": " + f.count +
              (f.missing.length ? " (missing " + f.missing.join(",") + ")" : ""));
}

if (copyDir) {
  fs.mkdirSync(copyDir, { recursive: true });
  let copied = 0, bytes = 0;
  for (const file of sdPngs) {
    const from = path.join(src, file);
    fs.copyFileSync(from, path.join(copyDir, file));
    copied++;
    bytes += fs.statSync(from).size;
  }
  console.log("copied " + copied + " PNGs (" + Math.round(bytes / 10240) / 100 +
              " MB) into " + copyDir);
}
