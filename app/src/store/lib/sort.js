/* Sort functions for various data types */

export const SortType = {
	STRING: 0,
	NUMERIC: 1,
	CLAUSE: 2,
	DATE: 3
}

export const SortDirection = {
	NONE: 'NONE',
	ASC: 'ASC',
	DESC: 'DESC'
}

const parseNumber = (value) => {
	// Return the value as-is if it's already a number
	if (typeof value === 'number')
		return value

	// Build regex to strip out everything except digits, decimal point and minus sign
	let regex = new RegExp('[^0-9-.]', ['g']);
	let unformatted = parseFloat((''+value).replace(regex, ''));

	// This will fail silently
	return !isNaN(unformatted)? unformatted: 0;
};

export const cmpNumeric = (a, b) => {
	const A = parseNumber(a);
	const B = parseNumber(b);
	return A - B;
}

export const cmpClause = (a, b) => {
	const A = a.split('.')
	const B = b.split('.')
	for (let i = 0; i < Math.min(A.length, B.length); i++) {
		if (A[i] !== B[i]) {
			// compare as a number if it looks like a number
			// otherwise, compare as string
			if (!isNaN(A[i]) && !isNaN(B[i])) {
				return parseNumber(A[i]) - parseNumber(B[i], 10);
			}
			else {
				return A[i] < B[i]? -1: 1;
			}
		}
	}
	// Equal so far, so straight string compare
	return A < B? -1: (A > B? 1: 0);
}

export const cmpString = (a, b) => {
	const A = ('' + a).toLowerCase();
	const B = ('' + b).toLowerCase();
	return A < B? -1: (A > B? 1: 0);
}

export const cmpDate = (a, b) => a - b

export const sortFunc = {
	[SortType.NUMERIC]: cmpNumeric,
	[SortType.CLAUSE]: cmpClause,
	[SortType.STRING]: cmpString,
	[SortType.DATE]: cmpDate
}

export function sortData(sortState, dataMap, data) {
	let sortedDataMap = dataMap;

	sortState.by.forEach(key => {
		const {direction, type} = sortState.sorts[key];
		if (direction !== SortDirection.ASC && direction !== SortDirection.DESC)
			return
		const cmpFunc = sortFunc[type]
		if (!cmpFunc) {
			console.warn(`No sort function for ${key} (sort type ${type[key]})`);
			return
		}
		const cmp = (index_a, index_b) => cmpFunc(data[index_a][key], data[index_b][key]);
		sortedDataMap = sortedDataMap.slice();
		sortedDataMap.sort(cmp);
		if (direction === SortDirection.DESC)
			sortedDataMap.reverse();
	});

	return sortedDataMap;
}

export function sortOptions(sort, options) {
	const {direction, type} = sort;
	let sortedOptions = options;

	if (direction === SortDirection.ASC || direction === SortDirection.DESC) {
		const cmpFunc = sortFunc[type];
		sortedOptions = sortedOptions.sort((itemA, itemB) => cmpFunc(itemA.value, itemB.value));
		if (direction === SortDirection.DESC)
			sortedOptions.reverse();
	}

	return sortedOptions;
}