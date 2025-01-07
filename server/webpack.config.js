import path from "node:path";

const __dirname = process.cwd();

export default {
	entry: {
		main: path.join(__dirname, "src/index.ts"),
	},
	output: {
		path: path.join(__dirname, "../build"),
		filename: "server.js",
	},
	resolve: {
		extensions: [".ts", ".js"],
		alias: {
			"@schemas": path.resolve(__dirname, "../schemas"),
		},
	},
	target: "node",
	node: {
		__dirname: false,
	},
	optimization: {
		//minimize: true,
		usedExports: true,
	},
	mode: "production",
	//mode: 'development',
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader",
			},
			{
				test: /\.js$/,
				type: "javascript/auto",
			},
		],
	},
};
