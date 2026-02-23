import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                L: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-useless-escape": "warn",
            "no-useless-assignment": "warn",
            "no-empty": "warn",
            "no-undef": "error"
        }
    }
];
