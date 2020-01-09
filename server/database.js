var mysql = require('mysql');

// Connect to the database
const or1db = {
	host: 'maria3094-us-or-in.icloud.intel.com',
	port: 3306,
	user: 'CommentDBTes_so',
	password: 'xVj59Xs3cE1U6Iz',
	database: 'CommentDBTest',
	multipleStatements: true
};

const fs = require('fs');
const fm1db = {
	host: 'maria3451-us-fm-in.icloud.intel.com',
	port: 3307,
	user: 'CommentDBTes_so',
	password: 'dRmYr2qO87fH4A3',
	database: 'CommentDBTest',
	ssl: {
		ca: fs.readFileSync(__dirname + '/ca_cert.pem'),
		cert: fs.readFileSync(__dirname + '/client_cert.pem'),
		key: fs.readFileSync(__dirname + '/client_key.pem'),
		rejectUnauthorized: false
	},
	multipleStatements: true
};

var pool = mysql.createPool(or1db);

module.exports = {
	pool: pool,
	
	// Promisified SQL query using connection pool
	query: function() {
		if (arguments.length === 0 || arguments.length > 2) {
			throw new Error('Invalid number of arguments'); 
		}
		const arg0 = arguments[0];
		const arg1 = arguments.length > 1? arguments[1]: [];
		return new Promise((resolve, reject) => {
			pool.query(arg0, arg1, (err, results) => {
				if (err) {
					return reject(err);
				}
				else {
					return resolve(results);
				}
			});
		});
	},

	escape: mysql.escape,

	format: mysql.format
};