/*
 * Promise wrapper for csv-parse callback operation
 *
 * We don't want to use sync operation since that blocks the main thread.
 */
import parse from 'csv-parse';
import { stringify } from 'csv-stringify';

export function csvParse(buffer, options) {
	return new Promise((resolve, reject) => {
		parse(buffer, options, (error, records) => {
			if (error)
				reject(error);
			else
				resolve(records);
		});
	});
}

export function csvStringify(records, options) {
  return new Promise((resolve, reject) => {
    stringify(records, options, (error, output) => {
      if (error)
        reject(error);
      else
        resolve(output);
    });
  });
}