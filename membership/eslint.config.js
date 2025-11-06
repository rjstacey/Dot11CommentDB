import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginRefresh from "eslint-plugin-react-refresh";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,jsx,tsx}"],
		languageOptions: {
			// common parser options, enable TypeScript and JSX
			parser: "@typescript-eslint/parser",
			parserOptions: {
				sourceType: "module",
				tsConfigRootDir: import.meta.dirname,
			},
			globals: globals.browser,
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
	pluginReact.configs.flat.recommended,
	pluginRefresh.configs.vite,
	{
		rules: {
			"no-unused-vars": "off",
			"no-undef": "off",
			"react/react-in-jsx-scope": "off",
			"react/prop-types": 0,
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ ignoreRestSiblings: true },
			],
		},
	},
];
