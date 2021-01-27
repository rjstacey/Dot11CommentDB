'use strict'

const mysql = require('mysql2');
let options, pool, ppool;

if (process.env.NODE_ENV === 'development') {
	const fs = require('fs'); 
	var certFileBuf = [
		fs.readFileSync("IntelCA5A(1)-base64.crt","utf8"),
		fs.readFileSync("IntelCA5B(1)-base64.crt","utf8"),
		fs.readFileSync("IntelSHA256RootCA-base64.crt","utf8")
	];
	options = {
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		multipleStatements: true,
		charset: 'UTF8MB4_GENERAL_CI',
		//ssl: { 
		//	ca: certFileBuf, 
		//	secureProtocol : 'TLS_method' 
		//} 
	}
}
else {
	options = {
		host: process.env.RDS_HOSTNAME,
		port: process.env.RDS_PORT,
		user: process.env.RDS_USERNAME,
		password: process.env.RDS_PASSWORD,
		database: process.env.RDS_DB_NAME,
		multipleStatements: true,
		charset: 'UTF8MB4_GENERAL_CI'
	}
}

function init() {
	//if (process.env.NODE_ENV === 'production')
		console.log(process.env.NODE_ENV, options)
	pool = mysql.createPool(options);
	ppool = pool.promise();
}

// Promisified SQL query using connection pool
// (from prior use of mysql)
/*function query_old() {
	if (arguments.length === 0 || arguments.length > 2) {
		throw new Error('Invalid number of arguments')
	}
	const arg0 = arguments[0]
	const arg1 = arguments.length > 1? arguments[1]: []
	return new Promise((resolve, reject) => {
		pool.query(arg0, arg1, (err, results) => err? reject(err): resolve(results))
	})
}*/

module.exports = {
	init,
	getPool: () => ppool,
	query: (...args) => ppool.query(...args).then(result => result[0]),
	query2: (...args) => ppool.query(...args),
	escape: mysql.escape,
	format: mysql.format
}
