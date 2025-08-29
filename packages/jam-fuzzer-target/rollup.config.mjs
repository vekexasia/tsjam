import fs from "fs";
import { rollupCreate } from "../../build/rollupconfigcreator.mjs";
import { terser } from "rollup-plugin-terser";
const tsOptions = { compilerOptions: { rootDir: "." } };

const p = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const external = Object.keys(p.dependencies ?? {})
  .concat("vitest")
  .concat(Object.keys(p.devDependencies ?? {}));
/**
 * @type {import('rollup').RollupOptions[]}
 */
export default [
  { ...rollupCreate({ isBrowser: false, isEsm: true }, tsOptions), external },
  {
    ...rollupCreate(
      {
        input: "src/cli.ts",
        outputFile: "dist/cli.mjs",
        isBrowser: false,
        isEsm: true,
        plugins: [terser()],
      },
      {
        compilerOptions: {
          rootDir: ".",
          sourceMap: false,
          inlineSourceMap: false,
          declaration: false,
          declarationMap: false,
        },
      },
    ),
    external: [
      ...Object.keys(p.devDependencies ?? {}),
      "@tsjam/crypto-napi",
      "bigint-buffer",
      "sodium-native",
    ],
  },
];
