/**
 * Check spreadsheet column headings against expected headings
 * 
 * @param headerRow Spreadsheet header row
 * @param expectedHeader Expected header row (array of exact string or regex comparisons)
 */
export function isCorrectSpreadsheetHeader(headerRow: any[], expectedHeader: readonly (string | RegExp)[]) {
	return expectedHeader.every((expectedValue, i) => {
		let value = headerRow[i];
		if (typeof value !== 'string')
			return false;
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
export function validateSpreadsheetHeader(headerRow: any[], expectedHeader: readonly (string | RegExp)[]) {
    if (!isCorrectSpreadsheetHeader(headerRow, expectedHeader))
		throw new TypeError(`Unexpected column headings:\n${headerRow.join(', ')}\n\nExpected:\n${expectedHeader.join(', ')}`);
}