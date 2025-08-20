import replace from "@rollup/plugin-replace";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { move, remove } from "fs-extra";
import { replaceTscAliasPaths } from "tsc-alias";
import fs from "fs";

/**
 *
 * @param conf {{isBrowser: boolean, isEsm: boolean}}
 * @param typescriptOptions {import('@rollup/plugin-typescript').RollupTypescriptOptions} eventual override of typescript options
 * @returns {import('rollup').RollupOptions}
 */
export const rollupCreate = (conf, typescriptOptions = null) => {
  const { isBrowser, isEsm, input, outputFile } = conf;
  return {
    input: input ?? "src/index.ts",
    output: [
      {
        format: `${isEsm ? "esm" : "cjs"}`,
        file:
          outputFile ??
          `dist/${isBrowser ? "browser" : "node"}.${isEsm ? "esm" : "cjs"}.${isEsm ? "m" : ""}js`,
        inlineDynamicImports: false,
        sourcemap: true,
      },
    ],
    plugins: [
      replace({
        values: {
          "import.meta.vitest": `false`,
        },
        preventAssignment: true,
      }),
      replace({
        values: {
          IS_BROWSER: `${isBrowser}`,
          ...(() => {
            if (isBrowser) {
              return {
                "native.js": "browser.js",
              };
            }
            return {};
          })(),
        },
        preventAssignment: true,
      }),

      ...(() => {
        if (!isEsm) {
          return [
            replace({
              values: {
                "await import(": "require(",
              },
              delimiters: ["", ""],
              preventAssignment: true,
            }),
          ];
        }
        return [];
      })(),
      typescript({
        tsconfig: "./tsconfig.json",
        include: ["src/**/*.ts", "test/**/*.ts"],
        noEmitOnError: true,
        ...(typescriptOptions || {}),
      }),

      json(),
      commonjs(),
      nodeResolve(),
      {
        name: "tscAlias",
        async writeBundle(options, bundle) {
          return replaceTscAliasPaths({
            configFile: "./tsconfig.json",
            outDir: "dist/src",
            rootDir: "./src",
          });
        },
      },
      {
        name: "mv-and-delete",
        async writeBundle(options, bundle) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (fs.existsSync("dist/src")) {
            console.log("Moving dist/src to dist/types");
            await move("dist/src", "dist/types", { overwrite: true });
            await remove("dist/src");
          }
        },
      },
    ],
  };
};
