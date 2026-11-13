/* Print the pixel size of a PNG from its IHDR chunk (no image library needed).
 * Usage: node tools/png-size.js <file.png> [file2 ...]
 * Used to measure GD's loose UI art so layouts are built on real dimensions.
 */
const fs = require("fs");

for (const file of process.argv.slice(2)) {
  try {
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    if (buf.toString("ascii", 1, 4) !== "PNG") { console.log(file + "\tNOT PNG"); continue; }
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    console.log(require("path").basename(file) + "\t" + w + "x" + h);
  } catch (e) {
    console.log(file + "\tERROR " + e.message);
  }
}
