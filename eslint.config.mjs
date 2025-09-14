import vueTsEsLintConfig from "@vue/eslint-config-typescript";
import prettierConfig from "@vue/eslint-config-prettier";

export default [
  {
    ignores: ["**/dist/**/*"],
  },
  prettierConfig,
  ...vueTsEsLintConfig(),
  // Custom rules
  {
    rules: {
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/jam-pvm-wasm/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
