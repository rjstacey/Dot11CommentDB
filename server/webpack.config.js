const path = require('path');

module.exports = {
	entry: {
		main: path.join(__dirname, 'src/index.js')
	},
	output: {
		path: path.join(__dirname, '../build'),
		filename: 'server.js'
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
	module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        type: 'javascript/auto',
      },
   ]
  }
};