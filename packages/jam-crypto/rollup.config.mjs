import typescript from '@rollup/plugin-typescript'
import {rollupCreate, rollupTypes} from "../../build/rollupconfigcreator.mjs";

const tsOptions = {compilerOptions: {rootDir: '.'}};

const external = ['@vekexasia/jam-codec', '@vekexasia/jam-types', 'blake2', "@vekexasia/jam-crypto-napi", "sodium-native"];

/**
 * @type {import('rollup').RollupOptions[]}
 */
export default [
  {... rollupCreate({isBrowser: false, isEsm: false}, tsOptions), external},
  {... rollupCreate({isBrowser: false, isEsm: true},tsOptions), external},
  {... rollupTypes(), external},
]
