import {rollupCreate, rollupTypes} from "../../build/rollupconfigcreator.mjs";

const tsOptions = {compilerOptions: {rootDir: '.'}};

const external = ['@vekexasia/jam-types', '@vekexasia/jam-crypto', '@vekexasia/jam-codec', '@vekexasia/jam-exstrinsics'];
/**
 * @type {import('rollup').RollupOptions[]}
 */
export default [
  {... rollupCreate({isBrowser: false, isEsm: false}, tsOptions), external},
  {... rollupCreate({isBrowser: false, isEsm: true}, tsOptions), external},
  {... rollupTypes(), external},
]
