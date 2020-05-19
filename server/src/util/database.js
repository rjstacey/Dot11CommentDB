'use strict'

const mysql = require('mysql')

// Connect to the database
let options
if (process.env.NODE_ENV !== 'development') {
	options = {
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		multipleStatements: true
	}
}
else {
	options = {
		host: process.env.RDS_HOSTNAME,
		port: process.env.RDS_PORT,
		user: process.env.RDS_USERNAME,
		password: process.env.RDS_PASSWORD,
		database: process.env.RDS_DB_NAME,
		multipleStatements: true
	}
}

//console.log(options)
const pool = mysql.createPool(options)

// Promisified SQL query using connection pool
function query() {
	if (arguments.length === 0 || arguments.length > 2) {
		throw new Error('Invalid number of arguments')
	}
	const arg0 = arguments[0]
	const arg1 = arguments.length > 1? arguments[1]: []
	return new Promise((resolve, reject) => {
		pool.query(arg0, arg1, (err, results) => err? reject(err): resolve(results))
	})
}

module.exports = {
	pool,
	query,
	escape: mysql.escape,
	format: mysql.format
}
