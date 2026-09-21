// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");
const eslintPluginPrettier = require("eslint-plugin-prettier");

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      // Every if/for/while block must use braces, one-liners are not allowed.
      curly: ["error", "all"],
      "prettier/prettier": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { vars: "all", args: "all", argsIgnorePattern: "^_", ignoreRestSiblings: true, caughtErrors: "all" },
      ],
    },
  },
  eslintConfigPrettier,
  {
    ignores: ["dist/*"],
  },
]);
