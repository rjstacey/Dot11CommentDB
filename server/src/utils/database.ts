import {
	createPool,
	escape,
	format,
	Pool,
	PoolOptions,
	QueryOptions,
} from "mysql2";

let ppool: ReturnType<Pool["promise"]>;

async function init() {
	
	if (!process.env.DB_HOST) {
		console.warn(
			"Environment variables DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE not set"
		);
	}

	let options: PoolOptions = {
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		timezone: "-08:00",
		multipleStatements: true,
		charset: "UTF8MB4_GENERAL_CI",
	};

	console.log(options);

	options.typeCast = function (field, next) {
		if (field.type === "TINY" && field.length === 1) {
			/* Cast TINYINT(1) as boolean */
			return field.string() === "1"; // 1 = true, 0 = false
		} else if (field.type === "DECIMAL" || field.type === "NEWDECIMAL") {
			let value = field.string();
			return value === null ? null : Number(value);
		} else {
			return next();
		}
	};

	const pool = createPool(options);
	ppool = pool.promise();
	await ppool.query("SET time_zone='-08:00';");
}

/* There seems to be a bug in the typing; dateStrings should be an option */
type QueryArgs =
	| [string, any?]
	| [QueryOptions | { dateStrings?: boolean }, any?];

const query = (...args: QueryArgs) =>
	ppool.query(...(args as [any])).then(([rows, fields]) => rows);
const query2 = (...args: QueryArgs) => ppool.query(...(args as [any]));

export { init, query, query2, escape, format };

export default {
	init,
	query,
	query2,
	escape,
	format,
};
