import vueTsEsLintConfig from "@vue/eslint-config-typescript";
import prettierConfig from "@vue/eslint-config-prettier";


export default [{
    ignores: ["**/dist/**/*"],
}, prettierConfig, ... vueTsEsLintConfig(),

];
