import replace from "@rollup/plugin-replace";
import fs from "fs";
import { rollupCreate } from "../../build/rollupconfigcreator.mjs";
import { execSync } from "child_process";
import { terser } from "rollup-plugin-terser";
const tsOptions = { compilerOptions: { rootDir: "." } };
const shortHash = execSync("git rev-parse --short=8 HEAD").toString().trim();
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
        plugins: [
          replace({
            values: {
              $$commit$$: shortHash,
              // https://github.com/davxy/jam-conformance/issues/35
              "process.env.RUNNING_TRACE_TESTS": '"true"',
              "process.env.TRACE_FILE": false,
              "process.env.DEBUG_STEPS": false,
              "process.env.DEBUG_TRACES": false,
            },
            delimiters: ["", ""],
            preventAssignment: true,
          }),
          terser(),
        ],
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
