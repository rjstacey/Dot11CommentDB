import ExcelJS from "exceljs";
import { csvParse } from "./csv.js";

/**
 * Check spreadsheet column headings against expected headings
 *
 * @param headerRow Spreadsheet header row
 * @param expectedHeader Expected header row (array of exact string or regex comparisons)
 */
export function isCorrectSpreadsheetHeader(
	headerRow: string[],
	expectedHeader: readonly (string | RegExp)[]
) {
	return expectedHeader.every((expectedValue, i) => {
		let value = headerRow[i];
		if (typeof value !== "string") return false;
		value = value.trim();
		if (expectedValue instanceof RegExp && expectedValue.test(value))
			return true;
		return value === expectedValue;
	});
}

/**
 * Validate spreadsheet header.
 *
 * @param headerRow Spreadsheet header row
 * @param expectedHeader Expected header row (array of exact string or regex comparisons)
 */
export function validateSpreadsheetHeader(
	headerRow: string[],
	expectedHeader: readonly (string | RegExp)[]
) {
	if (!isCorrectSpreadsheetHeader(headerRow, expectedHeader))
		throw new TypeError(
			`Unexpected column headings:\n${headerRow.join(
				", "
			)}\n\nExpected:\n${expectedHeader.join(", ")}`
		);
}

/**
 * Parse a spreadsheet in .xlsx or .csv format.
 *
 * @param file Basic file information (original name and buffer)
 * @param expectedHeader An array of strings (or regexs) to match against the expected table header.
 * @param headerRowIndex (Optional) Header row index. Defaults to 0.
 * @param numberColumns (Optional) Number of columns to extract. Defaults to the number of columns in the expected header.
 * @returns An array of arrays (rows and columns of table) where each entry is a string.
 */
export async function parseSpreadsheet(
	filename: string,
	buffer: Buffer,
	expectedHeader: readonly (string | RegExp)[],
	headerRowIndex = 0,
	numberColumns = 0
) {
	let rows: string[][]; // an array of arrays
	if (filename.search(/\.xlsx$/i) >= 0) {
		const workbook = new ExcelJS.Workbook();
		try {
			await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
		} catch (error) {
			throw TypeError("Invalid workbook: " + error);
		}

		rows = [];
		workbook.getWorksheet(1)?.eachRow((row) => {
			if (Array.isArray(row.values))
				rows.push(
					row.values
						.slice(1, (numberColumns || expectedHeader.length) + 1)
						.map((r) =>
							typeof r === "string" ? r : r ? r.toString() : ""
						)
				);
		});
	} else if (filename.search(/\.csv$/i) >= 0) {
		rows = await csvParse(buffer, {
			columns: false,
			bom: true,
			encoding: "latin1",
		});
	} else {
		throw TypeError(
			"Must be an Excel Workbook (*.xlsx) or .csv file. Older Excel Workbook formats are not supported."
		);
	}

	if (rows.length === 0) throw new TypeError("Empty spreadsheet file");

	rows.splice(0, headerRowIndex);
	validateSpreadsheetHeader(rows.shift()!, expectedHeader);

	return rows;
}
