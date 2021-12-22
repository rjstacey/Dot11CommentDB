'use strict'

const mysql = require('mysql2');
let ppool;

export function init() {
	let options;
	if (process.env.NODE_ENV === 'development') {
		options = {
			host: process.env.DB_HOST,
			port: process.env.DB_PORT,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_DATABASE,
			multipleStatements: true,
			//dateStrings: true,
			charset: 'UTF8MB4_GENERAL_CI',
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
			//dateStrings: true,
			charset: 'UTF8MB4_GENERAL_CI'
		}
	}

	console.log('NODE_ENV=', process.env.NODE_ENV, options)
	const pool = mysql.createPool(options);
	ppool = pool.promise();
}

export const getPool = () => ppool;
export const query = (...args) => ppool.query(...args).then(result => result[0]);
export const query2 = (...args) => ppool.query(...args);
export const escape = mysql.escape;
export const escapeId = mysql.escapeId;
export const format = mysql.format;
