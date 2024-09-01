import typescript from '@rollup/plugin-typescript'
import {rollupCreate, rollupTypes} from "../../build/rollupconfigcreator.mjs";

const tsOptions = {compilerOptions: {rootDir: '.'}};
const externals = ['@vekexasia/jam-types', '@vekexasia/jam-codec', "vitest"];
/**
 * @type {import('rollup').RollupOptions[]}
 */
export default [
  {... rollupCreate({isBrowser: false, isEsm: false}, tsOptions), external: externals},
  {... rollupCreate({isBrowser: false, isEsm: true},tsOptions), external: externals},
  {... rollupTypes(), external: externals},
]
