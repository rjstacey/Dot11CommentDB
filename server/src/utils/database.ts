import { createPool, escape, format } from "mysql2/promise";
import type {
	Pool,
	PoolOptions,
	QueryOptions,
	//RowDataPacket,
	//ResultSetHeader,
	QueryResult,
} from "mysql2/promise";

let pool: Pool; //ReturnType<Pool["promise"]>;

async function init() {
	if (!process.env.DB_HOST) {
		console.warn(
			"Environment variables DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_DATABASE not set"
		);
	}

	const options: PoolOptions = {
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		timezone: "-08:00",
		multipleStatements: true,
		charset: "UTF8MB4_GENERAL_CI",
		decimalNumbers: true,
		dateStrings: true,
	};

	//console.log(options);

	options.typeCast = function (field, next) {
		if (field.type === "TINY" && field.length === 1) {
			/* Cast TINYINT(1) as boolean */
			return field.string() === "1"; // 1 = true, 0 = false
			//} else if (field.type === "DECIMAL" || field.type === "NEWDECIMAL") {
			//	let value = field.string();
			//	return value === null ? null : Number(value);
		} else {
			return next();
		}
	};

	pool = createPool(options);

	await pool.query("SET time_zone='-08:00';");
}

/* There seems to be a bug in the typing; dateStrings should be an option */
interface QueryOptions2 extends QueryOptions {
	dateStrings: boolean;
}
function query<T extends QueryResult>(
	sql: string,
	values?: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<T>;
function query<T extends QueryResult>(
	options: QueryOptions2,
	values?: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<T>;
async function query<T extends QueryResult>(
	sql: any, // eslint-disable-line @typescript-eslint/no-explicit-any
	values?: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
	return pool.query<T>(sql, values).then(([rows]) => rows);
}

export { init, query, escape, format };

export default {
	init,
	query,
	escape,
	format,
};
