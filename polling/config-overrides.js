var path = require("path");

const {
	override,
	babelInclude,
	removeModuleScopePlugin,
} = require("customize-cra");

module.exports = function (config, env) {
	config.resolve = {
		...config.resolve,
		alias: {
			...config.resolve.alias,
			"@schemas": path.resolve("../schemas"),
		},
	};
	return Object.assign(
		config,
		override(
			removeModuleScopePlugin(),
			babelInclude([path.resolve("src"), path.resolve("../schemas")])
		)(config, env)
	);
};
