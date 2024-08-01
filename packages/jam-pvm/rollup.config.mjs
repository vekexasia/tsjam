import typescript from '@rollup/plugin-typescript'
import {rollupCreate, rollupTypes} from "../../build/rollupconfigcreator.mjs";

const tsOptions = {compilerOptions: {rootDir: '.'}};
/**
 * @type {import('rollup').RollupOptions[]}
 */
export default [
  {... rollupCreate({isBrowser: false, isEsm: false}, tsOptions), external: ['@vekexasia/jam-types', '@vekexasia/jam-codec']},
  {... rollupCreate({isBrowser: false, isEsm: true},tsOptions), external: ['@vekexasia/jam-types', '@vekexasia/jam-codec']},
  {... rollupTypes(), external: []},
]
