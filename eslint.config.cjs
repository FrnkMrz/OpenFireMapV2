const js = require("@eslint/js");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "docs/**",
      "public/assets/vendor/**",
      "archive/**",
    ],
  },

  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        performance: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        Image: "readonly",
        KeyboardEvent: "readonly",
        DOMException: "readonly",
        CustomEvent: "readonly",
        AbortController: "readonly",

        // Leaflet
        L: "readonly",
      },
    },
    ...js.configs.recommended,
  },
];

