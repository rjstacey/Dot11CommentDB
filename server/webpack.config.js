const path = require('path');

module.exports = {
	entry: path.join(__dirname, 'src/index.js'),
	output: {
		path: path.join(__dirname, '../build'),
		filename: 'server.js'
	},
	target: 'node',
	node: {
		__dirname: false,
	},
	optimization: {
		minimize: false
	},
	mode: 'development'
};