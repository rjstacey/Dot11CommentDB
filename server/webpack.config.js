const path = require('path');

module.exports = {
	entry: {
		main: path.join(__dirname, 'src/index.ts')
	},
	output: {
		path: path.join(__dirname, '../build'),
		filename: 'server.js'
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	target: 'node',
	node: {
		__dirname: false,
	},
	optimization: {
		//minimize: true,
		usedExports: true
	},
	mode: 'production',
	//mode: 'development',
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: 'ts-loader',
			},
			{
				test: /\.js$/,
				type: 'javascript/auto',
			},
		]
	}
};