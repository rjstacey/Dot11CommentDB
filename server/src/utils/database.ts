import mysql from 'mysql2';

let ppool: ReturnType<mysql.Pool["promise"]>;

export function init() {
	let options: mysql.PoolOptions;
	if (process.env.NODE_ENV === 'development') {
		options = {
			host: process.env.DB_HOST,
			port: Number(process.env.DB_PORT),
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_DATABASE,
			timezone: '-08:00'
		}
	}
	else {
		options = {
			host: process.env.RDS_HOSTNAME,
			port: Number(process.env.RDS_PORT),
			user: process.env.RDS_USERNAME,
			password: process.env.RDS_PASSWORD,
			database: process.env.RDS_DB_NAME,
		}
	}
	options = {
		...options,
		multipleStatements: true,
		charset: 'UTF8MB4_GENERAL_CI',
	}

	console.log('NODE_ENV=', process.env.NODE_ENV);
	console.log(options);
	
	const pool = mysql.createPool(options);
	ppool = pool.promise();
	ppool.query("SET time_zone='-08:00';");
}

export type OkPacket = mysql.OkPacket;

/* There seems to be a bug in the typing; dateStrings should be an option */
type QueryArgs = [string, any?] | [mysql.QueryOptions | {dateStrings?: boolean}, any?];

export const query = (...args: QueryArgs) => ppool.query(...args as [any]).then(([rows, fields]) => rows);
export const query2 = (...args: QueryArgs) => ppool.query(...args as [any]);
export const escape = mysql.escape;
export const format = mysql.format;

export default {
	init,
	query,
	query2,
	escape,
	format
};