/*
 * Promise wrappers for csv-parse and csv-stringify callback operation
 *
 * We don't want to use sync operation since that blocks the main thread.
 */
import { parse, Options as ParseOptions } from "csv-parse";
import {
	stringify,
	Input as StringifyInput,
	Options as StringifyOptions,
} from "csv-stringify";

type CsvObjRow = { [n: string]: string };
export function csvParse(
	buffer: Buffer,
	options: { columns: false } & ParseOptions
): Promise<string[][]>;
export function csvParse(
	buffer: Buffer,
	options: { columns: true } & ParseOptions
): Promise<CsvObjRow[]>;
export function csvParse(
	buffer: Buffer,
	options: ParseOptions
): Promise<CsvObjRow[] | string[][]> {
	return new Promise((resolve, reject) => {
		parse(
			buffer,
			options,
			(error: Error | undefined, records: CsvObjRow[] | string[][]) => {
				if (error) reject(error);
				else resolve(records);
			}
		);
	});
}

export function csvStringify(
	records: StringifyInput,
	options: StringifyOptions
): Promise<string> {
	return new Promise((resolve, reject) => {
		stringify(records, options, (error, output) => {
			if (error) reject(error);
			else resolve(output);
		});
	});
}
