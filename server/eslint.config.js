import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,jsx,tsx}"],
		languageOptions: {
			// common parser options, enable TypeScript and JSX
			parser: "@typescript-eslint/parser",
			parserOptions: {
				sourceType: "module",
				tsconfigRootDir: import.meta.dirname,
			},
			globals: globals.node,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
	},
	{ ignores: ["dev-dist", "scripts"] },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			"no-unused-vars": "off",
			"no-undef": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ ignoreRestSiblings: true },
			],
		},
	},
];
