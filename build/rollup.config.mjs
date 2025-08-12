import fs from "fs";
import { rollupCreate, rollupTypes } from "./rollupconfigcreator.mjs";
const tsOptions = { compilerOptions: { rootDir: "." } };

const p = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const external = Object.keys(p.dependencies ?? {})
  .concat("vitest")
  .concat(Object.keys(p.devDependencies ?? {}));
/**
 * @type {import('rollup').RollupOptions[]}
 */
export default [
  { ...rollupCreate({ isBrowser: false, isEsm: false }, tsOptions), external },
  { ...rollupCreate({ isBrowser: false, isEsm: true }, tsOptions), external },
  { ...rollupTypes(), external },
];
