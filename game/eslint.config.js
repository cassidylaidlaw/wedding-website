
import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        "languageOptions": {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        "rules": {
            "semi": ["error", "always"],
            "quotes": ["error", "double"]
        }
    }
];