/* Build the level set the play layer runs (levels/manifest.json + one JSON per
 * level) out of the real Geometry Dash level files.
 *
 * GD keeps a level as one long object string; the official levels ship it
 * base64url + gzip in Resources/levels/<id>.txt, and level exports (.gmd,
 * CCLocalLevels.dat) wrap the same string in an XML plist. src/core/Levels.js
 * reads every one of those wrappers and owns the object table, so this tool is
 * only decoding + writing: one source of truth for both the browser and Node.
 *
 * Usage (run from web/):
 *   node tools/level-import.js ../gdstuffs/Resources/levels --out levels
 *   node tools/level-import.js my-level.gmd --out levels
 *   node tools/level-import.js CCLocalLevels.dat --out levels
 *
 * --out      where to write manifest.json and <id>.json (default levels)
 * --all      also take the numbered files that are not main levels (3001, 5001:
 *            GD 2.2's platformer levels, which this play layer cannot run)
 *
 * Objects this build cannot draw (decoration, triggers, the 2.x object library)
 * are dropped by Levels.parse(), which is why a 27k object level bakes down to a
 * few thousand entries. The tool prints what it kept so a level that comes out
 * suspiciously small shows up immediately.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const Levels = require("../src/core/Levels.js");

function usage(message) {
    if (message) console.error(message);
    console.error("usage: node tools/level-import.js <levels dir | level file...> " +
                  "[--out <dir>] [--no-main]");
    process.exit(2);
}

function fail(message) {
    console.error(message);
    process.exit(1);
}

function isGzip(buffer) {
    return buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/* Any GD level file -> the plain level string. Handles the gzip wrapper the
 * official levels use and the base64url text wrapper around it. */
function levelText(file) {
    let buffer = fs.readFileSync(file);
    if (isGzip(buffer)) buffer = zlib.gunzipSync(buffer);

    const text = buffer.toString("utf8").replace(/\u0000/g, "").trim();
    if (text.length > 64 && /^[A-Za-z0-9+/=_-]+$/.test(text))
        return zlib.gunzipSync(Buffer.from(text, "base64url")).toString("utf8");
    return text;
}

function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/* Everything in a file -> [{name, author, data}], the same reader the browser
 * uses for a dropped .gmd. */
function readSources(file) {
    const text = levelText(file);
    const sources = Levels.sources(text);
    if (!sources.length) fail(`${file}: no level data (not a plist and not a level string)`);
    return sources;
}

/* One level -> the packed record the runtime loads. */
function collect(meta, source, file) {
    const level = Levels.parse(source.data, meta);
    if (!level.objects.length) fail(`${meta.name}: no objects this build understands`);

    const packed = Levels.pack(level);
    packed.file = `${file}.json`;

    return {
        packed: packed,
        entry: {
            id: packed.id,
            name: packed.name,
            author: packed.author,
            stars: packed.stars,
            diff: packed.diff,
            song: packed.song,
            file: packed.file,
            objects: packed.objects.length,
            length: packed.length,
            coins: packed.coins
        }
    };
}

function write(outDir, levels, skipped) {
    fs.mkdirSync(outDir, { recursive: true });

    const written = new Set(["manifest.json"]);

    for (const level of levels) {
        fs.writeFileSync(path.join(outDir, level.entry.file), JSON.stringify(level.packed));
        written.add(level.entry.file);
    }

    // Levels from an older run (or the hand-written placeholder) are not part of
    // this set any more, so the folder matches the manifest exactly.
    const stale = fs.readdirSync(outDir)
        .filter((f) => f.endsWith(".json") && !written.has(f));
    for (const f of stale) fs.unlinkSync(path.join(outDir, f));

    const manifest = {
        generated: new Date().toISOString().slice(0, 10),
        levels: levels.map((level) => level.entry)
    };
    fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

    let kept = 0;
    for (const level of levels) kept += level.entry.objects;
    console.log(`${levels.length} levels, ${kept} objects -> ${outDir}`);
    for (const level of levels) {
        console.log(`  ${String(level.entry.id).padStart(3)}  ${level.entry.name.padEnd(24)} ` +
                    `${String(level.entry.objects).padStart(6)} objects  ` +
                    `${String(Math.round(level.entry.length / Levels.UNIT)).padStart(5)} cells`);
    }
    if (skipped && skipped.length)
        console.log(`skipped ${skipped.length} non-main level(s): ${skipped.join(" ")} (--all takes them)`);
    if (stale.length) console.log(`removed ${stale.length} stale file(s): ${stale.join(" ")}`);
}

function main(argv) {
    const args = argv.slice(2);
    let outDir = "levels";
    let all = false;
    const targets = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--out") outDir = args[++i] || usage("--out needs a folder");
        else if (arg === "--all") all = true;
        else if (arg === "--help" || arg === "-h") usage();
        else targets.push(arg);
    }
    if (!targets.length) usage("nothing to import");

    const levels = [];
    let skipped = [];

    for (const target of targets) {
        if (!fs.existsSync(target)) fail(`${target}: no such file or folder`);

        if (fs.statSync(target).isDirectory()) {
            const files = fs.readdirSync(target)
                .filter((f) => /^\d+\.txt$/.test(f))
                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            if (!files.length) fail(`${target}: no <id>.txt level files`);

            for (const file of files) {
                const id = parseInt(file, 10);
                const main = Levels.main(id);
                if (!main && !all) { skipped.push(file); continue; }

                const sources = readSources(path.join(target, file));
                const meta = main
                    ? { id: main.id, name: main.name, author: Levels.MAIN_AUTHOR,
                        stars: main.stars, diff: main.diff, song: main.song }
                    : { id: id, name: `Level ${id}`, author: "", stars: 0, diff: 0, song: null };

                levels.push(collect(meta, sources[0], `${id}-${slug(meta.name)}`));
            }
            continue;
        }

        for (const source of readSources(target)) {
            const meta = { id: slug(source.name) || "imported", name: source.name,
                           author: source.author, stars: 0, diff: 0, song: null };
            levels.push(collect(meta, source, slug(source.name) || "imported"));
        }
    }

    write(outDir, levels, skipped);
}

main(process.argv);

