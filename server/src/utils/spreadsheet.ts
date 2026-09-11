import ExcelJS from "exceljs";
import { csvParse } from "./csv.js";

/**
 * Check spreadsheet column headings against expected headings
 *
 * @param headerRow Spreadsheet header row
 * @param expectedHeader Expected header row (array of exact string or regex comparisons)
 */
export function isCorrectSpreadsheetHeader (
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
export function validateSpreadsheetHeader (
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
 * Get the display text of an ExcelJS cell value
 * @param cellValue - The value from cell.value
 * @returns The plain text representation
 */
function getCellAsText (cellValue: ExcelJS.CellValue): string {
	if (cellValue === null || cellValue === undefined) return "";

	// Primitive types
	if (
		typeof cellValue === "string" ||
		typeof cellValue === "number" ||
		typeof cellValue === "boolean"
	) {
		return String(cellValue);
	}
	if (cellValue instanceof Date) {
		return cellValue.toISOString(); // Change format if needed
	}

	// Formula object
	if ((cellValue as any).formula !== undefined) {
		const formulaObj = cellValue as {
			formula: string;
			result?: ExcelJS.CellValue;
		};
		return formulaObj.result !== undefined
			? getCellAsText(formulaObj.result)
			: "";
	}

	// Hyperlink object
	if ((cellValue as any).hyperlink !== undefined) {
		const linkObj = cellValue as { text?: string; hyperlink: string };
		return linkObj.text || linkObj.hyperlink;
	}

	// Rich text
	if ((cellValue as any).richText !== undefined) {
		const richTextArr = (cellValue as { richText: ExcelJS.RichText[] })
			.richText;
		return richTextArr.map(rt => rt.text).join("");
	}

	// Error object
	if ((cellValue as any).error !== undefined) {
		return `#ERROR: ${(cellValue as { error: string }).error}`;
	}

	// Fallback
	try {
		return String(cellValue);
	} catch {
		return "";
	}
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
export async function parseSpreadsheet (
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
		workbook.worksheets[0]?.eachRow(row => {
			if (Array.isArray(row.values))
				rows.push(
					row.values
						.slice(1, (numberColumns || expectedHeader.length) + 1)
						.map(getCellAsText)
				);
		});
	} else if (filename.search(/\.csv$/i) >= 0) {
		rows = await csvParse(buffer, {
			columns: false,
			bom: true,
			encoding: "utf-8"
		});
	} else {
		throw TypeError(
			"Must be an Excel Workbook (*.xlsx) or .csv file. Older Excel Workbook formats are not supported."
		);
	}

	if (rows.length === 0) throw new TypeError("Empty spreadsheet file");

	rows.splice(0, headerRowIndex); // Remove rows before the header row (if any)
	validateSpreadsheetHeader(rows.shift()!, expectedHeader);

	return rows;
}
