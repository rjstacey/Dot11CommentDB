import js from "@eslint/js";

export default [
	js.configs.recommended,
	{
		ignores: ["dev-dist/*"],
	},
	{
		rules: {
			"no-unused-vars": "warn",
			"no-undef": "warn",
		},
	},
];
