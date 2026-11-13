/* Dump every sprite-frame name of a plist to a text file, one per line.
 * Usage: node tools/dump-frames.js <plist> <outFile>
 * Used to keep layouts honest: a screen may only reference frames that exist.
 */
const fs = require("fs");
const path = require("path");

const plist = process.argv[2];
const out = process.argv[3];
if (!plist || !out) {
  console.error("usage: node tools/dump-frames.js <plist> <outFile>");
  process.exit(2);
}

const xml = fs.readFileSync(plist, "utf8");
const names = [];
const re = /<key>([^<]+)<\/key>\s*<dict>/g;   // <key>frame.png</key><dict>...</dict>
let m;
while ((m = re.exec(xml)) !== null) {
  const key = m[1];
  if (/\.(png|jpg|jpeg)$/i.test(key)) names.push(key);
}
// Frames are stored as <key>frames</key><dict><key>name.png</key>..., so the
// regex above also catches "metadata"-level keys; the extension filter drops them.
names.sort();
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, names.join("\n") + "\n");
console.log(path.basename(plist) + ": " + names.length + " frames -> " + out);
