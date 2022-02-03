/*
 * Promise wrapper for csv-parse callback operation
 *
 * We don't want to use sync operation since that blocks the main thread.
 */
import parse from 'csv-parse';

function csvParse(buffer, options) {
	return new Promise((resolve, reject) => {
		parse(buffer, options, (error, records) => {
			if (error)
				reject(error);
			else
				resolve(records);
		});
	});
}

export default csvParse;
