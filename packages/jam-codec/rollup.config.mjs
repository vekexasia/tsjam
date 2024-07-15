import {rollupCreate, rollupTypes} from "../../build/rollupconfigcreator.mjs";

const tsOptions = {compilerOptions: {rootDir: '.'}};

/**
 * @type {import('rollup').RollupOptions[]}
 */
export default [
  {... rollupCreate({isBrowser: false, isEsm: false}, tsOptions), external: ['@vekexasia/jam-types']},
  {... rollupCreate({isBrowser: false, isEsm: true}, tsOptions), external: ['@vekexasia/jam-types']},
  {... rollupTypes(), external: ['@vekexasia/jam-types']},
]
