#!/usr/bin/env node
const fs = require("fs").promises;
const path = require("path");

function usage() {
  console.log(
    "Usage: update-versions.js --version <v> --protocol <p> [--dry-run] [--dir <dir>] [--all] [--exclude a,b] [--only pkg1,pkg2]",
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
let version = null;
let protocol = null;
let dryRun = false;
let dir = "packages";
let all = false;
let exclude = [];
let only = [];

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  switch (a) {
    case "--version":
    case "-v":
      version = argv[++i];
      break;
    case "--protocol":
    case "-p":
      protocol = argv[++i];
      break;
    case "--dry-run":
    case "-d":
      dryRun = true;
      break;
    case "--dir":
      dir = argv[++i];
      break;
    case "--all":
      all = true;
      break;
    case "--exclude":
      exclude = (argv[++i] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      break;
    case "--only":
      only = (argv[++i] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      break;
    default:
      usage();
  }
}

if (!version || !protocol) usage();
if (all) dir = ".";

async function findPackageJsons(startDir) {
  const out = [];
  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (err) {
      return;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name === "package.json") out.push(full);
    }
  }
  await walk(startDir);
  return out;
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (_) {
    return null;
  }
}

async function writeJson(file, obj) {
  await fs.writeFile(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function matchesOnly(pkgObj, file) {
  if (!only.length) return true;
  const name = pkgObj && pkgObj.name ? pkgObj.name : "";
  const base = path.basename(path.dirname(file));
  return only.includes(name) || only.includes(base);
}

function isExcluded(file) {
  if (!exclude.length) return false;
  const rel = path.relative(process.cwd(), file);
  return exclude.some((e) => rel.includes(e));
}

async function processFile(file) {
  const pkg = await readJson(file);
  if (!pkg) {
    console.warn(`Skipping invalid JSON: ${file}`);
    return false;
  }
  if (!matchesOnly(pkg, file)) return false;
  if (isExcluded(file)) return false;

  const beforeV = pkg.version;
  const beforeP = pkg["jam:protocolVersion"];
  pkg.version = version;
  pkg["jam:protocolVersion"] = protocol;

  if (dryRun) {
    console.log(
      `[dry-run] ${file}: version ${beforeV} -> ${pkg.version}, jam:protocolVersion ${beforeP} -> ${pkg["jam:protocolVersion"]}`,
    );
    return true;
  }

  await writeJson(file, pkg);
  console.log(`Updated ${file}`);
  return true;
}

(async () => {
  try {
    const start = path.resolve(process.cwd(), dir);
    console.log(`Searching for package.json under ${start}`);
    const files = await findPackageJsons(start);
    if (!files.length) {
      console.error("No package.json files found.");
      process.exit(1);
    }

    let count = 0;
    for (const f of files) {
      const ok = await processFile(f);
      if (ok && !dryRun) count++;
    }
    console.log(
      dryRun ? "Dry run complete." : `Updated ${count} package.json files.`,
    );
  } catch (err) {
    console.error("Error:", err && err.message ? err.message : err);
    process.exit(2);
  }
})();
