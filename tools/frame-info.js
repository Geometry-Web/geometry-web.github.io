/* Print the native size (and trimmed size/offset) of sprite frames from a plist.
 * Usage: node tools/frame-info.js <plist> <frame> [frame2 ...]
 * Layout code is written against these numbers, never invented ones.
 */
const fs = require("fs");

const [, , plistPath, ...wanted] = process.argv;
if (!plistPath || !wanted.length) {
  console.error("usage: node tools/frame-info.js <plist> <frame> [frame2 ...]");
  process.exit(2);
}
const xml = fs.readFileSync(plistPath, "utf8");

function frameBlock(name) {
  const idx = xml.indexOf("<key>" + name + "</key>");
  if (idx < 0) return null;
  return xml.slice(idx, xml.indexOf("</dict>", idx));
}
function num(block, key) {
  const m = new RegExp("<key>" + key + "</key>\\s*<(?:string|integer)>([^<]+)</").exec(block);
  return m ? m[1] : null;
}
function rect(s) {
  if (!s) return null;
  const n = s.replace(/[{}]/g, "").split(",").map(Number);
  return { x: n[0], y: n[1], w: n[2], h: n[3] };
}

for (const name of wanted) {
  const block = frameBlock(name);
  if (!block) { console.log(name + "\tMISSING"); continue; }
  const tex = rect(num(block, "textureRect"));
  const src = num(block, "spriteSourceSize");
  const srcR = src ? src.replace(/[{}]/g, "").split(",").map(Number) : null;
  const size = num(block, "spriteSize") || "";
  const sizeR = size.replace(/[{}]/g, "").split(",").map(Number);
  console.log(
    name +
    "\tnative=" + (srcR ? srcR[2] + "x" + srcR[3] : sizeR[0] + "x" + sizeR[1]) +
    "\ttrimmed=" + tex.w + "x" + tex.h +
    "\toffset=" + (srcR ? srcR[0] + "," + srcR[1] : "0,0") +
    "\trotated=" + (num(block, "textureRotated") || "0")
  );
}

// Two-number versioned footer keeps the output easy to diff.
console.log("--- sheet: " + require("path").basename(plistPath) + " ---");
