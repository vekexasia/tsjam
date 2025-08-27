const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

const input = path.join(root, 'dist', 'cli.mjs');
if (!fs.existsSync(input)) {
  console.error(`Input not found: ${input}\nDid you run: yarn build?`);
  process.exit(1);
}

const version = pkg.version;
const proto = pkg['jam:protocolVersion'];
const outName = `jam-fuzzer-target-v${version}-proto${proto}`;
const outPath = path.join(root, outName);

// Provide default cache dirs if not set (works well locally)
if (!process.env.XDG_CACHE_HOME && process.env.HOME) {
  process.env.XDG_CACHE_HOME = path.join(process.env.HOME, '.cache');
}
if (!process.env.NEXE_CACHE_DIR && process.env.XDG_CACHE_HOME) {
  process.env.NEXE_CACHE_DIR = path.join(process.env.XDG_CACHE_HOME, 'nexe');
}
if (process.env.NEXE_CACHE_DIR) {
  fs.mkdirSync(process.env.NEXE_CACHE_DIR, { recursive: true });
}

const args = [
  'nexe',
  '-i',
  input,
  '-o',
  outPath,
  '--build',
  '--verbose',
  '--target=22.18.0',
  '--make=-j8',
  '--flags=--max-old-space-size=16384',
];

console.log(`Building deliverable: ${outName}`);
const res = spawnSync('npx', args, {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});

if (res.error) {
  console.error(res.error);
}
process.exit(res.status ?? 1);

