import globals from "globals";
import js from "@eslint/js";
import ts from "typescript-eslint";
import react from "eslint-plugin-react";

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
			globals: globals.browser,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
	},
	{ ignores: ["dev-dist", "scripts"] },
	js.configs.recommended,
	...ts.configs.recommended,
	react.configs.flat.recommended,
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
