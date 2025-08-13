import replace from "@rollup/plugin-replace";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { move, remove } from "fs-extra";
import { replaceTscAliasPaths } from "tsc-alias";

/**
 *
 * @param conf {{isBrowser: boolean, isEsm: boolean}}
 * @param typescriptOptions {import('@rollup/plugin-typescript').RollupTypescriptOptions} eventual override of typescript options
 * @returns {import('rollup').RollupOptions}
 */
export const rollupCreate = (conf, typescriptOptions = null) => {
  const { isBrowser, isEsm } = conf;
  return {
    input: "src/index.ts",
    output: [
      {
        format: `${isEsm ? "esm" : "cjs"}`,
        file: typescriptOptions?.compilerOptions?.emitDeclarationOnly
          ? undefined
          : `dist/${isBrowser ? "browser" : "node"}.${isEsm ? "esm" : "cjs"}.${isEsm ? "m" : ""}js`,
        dir: typescriptOptions?.compilerOptions?.emitDeclarationOnly
          ? "dist/types_tmp"
          : undefined,
        // entryFileNames: `${isBrowser ? 'browser' : 'node'}.${isEsm ? 'esm' : 'cjs'}.${isEsm ? 'm' : ''}js`,
        // chunkFileNames: `includes/${isBrowser ? 'browser' : 'node'}.${isEsm ? 'esm' : 'cjs'}[hash].js`,
        // compact: true,
        inlineDynamicImports: false,
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
        include: [
          "../../build/types/globals.d.ts",
          "src/**/*.ts",
          "test/**/*.ts",
        ],
        noEmitOnError: true,
        ...(typescriptOptions || {}),
      }),

      json(),
      commonjs(),
      nodeResolve(),
    ],
  };
};

export const rollupTypes = () => {
  const base = rollupCreate(
    { isBrowser: false, isEsm: false },
    {
      compilerOptions: {
        declaration: true,
        rootDir: "./",
        emitDeclarationOnly: true,
        removeComments: false,
        skipLibCheck: true,
        noEmit: true,
        outDir: "dist/types_tmp",
        allowUnreachableCode: false,
      },
      include: ["../../../build/types/globals.d.ts", "./src/**/*.ts"],
      exclude: ["../test/*.ts"],
    },
  );
  base.plugins.push({
    name: "tscAlias",
    async writeBundle(options, bundle) {
      return replaceTscAliasPaths({
        configFile: "./tsconfig.json",
        outDir: "dist/types_tmp/src",
        rootDir: "./src",
      });
    },
  });
  base.plugins.push({
    name: "remove-transpiled",
    generateBundle: async (options, bundle, isWrite) => {
      delete bundle["node.cjs.js"];
    },
  });

  base.plugins.push({
    name: "mv-and-delete",
    async writeBundle(options, bundle) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await move("dist/types_tmp/src", "dist/types", { overwrite: true });
      await remove("dist/types_tmp");
    },
  });

  return base;
};

/**
 * Genrate standard browser and node rollup configurations + types
 * @param typescriptOptions {import('@rollup/plugin-typescript').RollupTypescriptOptions} eventual override of typescript options
 * @param externals {string[]} eventual override of externals
 * @returns {import('rollup').RollupOptions[]}
 */
export const rollupStandardCreate = (
  typescriptOptions = {},
  externals = [],
) => {
  return [
    {
      ...rollupCreate({ isBrowser: true, isEsm: true }, typescriptOptions),
      external: externals ?? [],
    },
    {
      ...rollupCreate({ isBrowser: true, isEsm: false }, typescriptOptions),
      external: externals ?? [],
    },
    {
      ...rollupCreate({ isBrowser: false, isEsm: false }, typescriptOptions),
      external: externals ?? [],
    },
    {
      ...rollupCreate({ isBrowser: false, isEsm: true }, typescriptOptions),
      external: externals ?? [],
    },
    { ...rollupTypes(), external: externals },
  ];
};
