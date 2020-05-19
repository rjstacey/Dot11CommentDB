// filter.js - filter utility
//
// Began life here https://github.com/koalyptus/TableFilter
//

const parseNumber = (value) => {
	// Return the value as-is if it's already a number
	if (typeof value === 'number') {
		return value
	}

	// Build regex to strip out everything except digits, decimal point and
	// minus sign
	let regex = new RegExp('[^0-9-.]', ['g']);
	let unformatted = parseFloat(
		('' + value)
			// strip out any cruft
			.replace(regex, '')
		);

	// This will fail silently
	return !isNaN(unformatted) ? unformatted : 0;
};

const rgxEsc = (text) => {
	let chars = /[-/\\^$*+?.()|[\]{}]/g;
	let escMatch = '\\$&';
	return String(text).replace(chars, escMatch);
};

const contains = (term, data, exactMatch = false, caseSensitive = false) => {
	let regexp;
	let modifier = caseSensitive ? 'g' : 'gi';
	if (exactMatch) {
		regexp = new RegExp('(^\\s*)' + rgxEsc(term) + '(\\s*$)', modifier);
	} else {
		regexp = new RegExp(rgxEsc(term), modifier);
	}
	return regexp.test(data);
};

function filterClause(dataMap, data, dataKey, str) {
	let len = str.length
	if (len && str[len-1] === '.') {
		len = len - 1
	}
	return dataMap.filter(i => {
		let d = data[i][dataKey]
		return d === str || (d && d.substring(0, len) === str.substring(0, len) && d[len] === '.')
	})
}

function filterRegex(dataMap, data, dataKey, regexStr) {
	let parts = regexStr.split('/'),
		regex = regexStr,
		options = "";
	if (parts.length > 1) {
		regex = parts[1];
		options = parts[2];
	}
	let rgx = new RegExp(regex, options);
	return dataMap.filter(i => rgx.test(data[i][dataKey]))
}

function regexValid(regexStr) {
	let parts = regexStr.split('/'),
		regex = regexStr,
		options = "";
	if (parts.length > 1) {
		regex = parts[1];
		options = parts[2];
	}
	try {
		new RegExp(regex, options)
	}
	catch(e) {
		return false
	}
	return true
}

function filterNumericRange(dataMap, data, dataKey, rangeStr) {
	const result = /^(<=|>=|<|>)(.*)/.exec(rangeStr)
	const compVal = parseNumber(result[2])
	let func = undefined
	if (result[1] === '<=') {
		func = (i => data[i][dataKey] <= compVal)
	}
	else if (result[1] === '>=') {
		func = (i => data[i][dataKey] >= compVal)
	}
	else if (result[1] === '<') {
		func = (i => data[i][dataKey] < compVal)
	}
	else if (result[1] === '>') {
		func = (i => data[i][dataKey] > compVal)
	}
	return dataMap.filter(func)
}

function numericRangeValid(rangeStr) {
	const result = /^(<=|>=|<|>)(.*)/.exec(rangeStr)
	return !isNaN(parseFloat(result[2]))
}

function filterNumeric(dataMap, data, dataKey, value) {
	const n = parseNumber(value)
	return dataMap.filter(i => data[i][dataKey] === n)
}

function filterPage(dataMap, data, dataKey, value) {
	let n = parseNumber(value)
	if (value.search(/\d+\./) !== -1) {
		// floating point number => exact match
		return dataMap.filter(i => data[i][dataKey] === n)
	}
	else {
		//Integer value => just match page
		return dataMap.filter(i => Math.round(data[i][dataKey]) === n)
	}
}

function filterValidate(type, value) {
	var valid = true
	if (value && value.length) {
		if (value[0] === '/') {	// regex
			valid = regexValid(value)
		}
		else if (type === FilterType.NUMERIC && (value[0] === '<' || value[0] === '>')) {
			valid = numericRangeValid(value)
		}
	}
	return valid
}

export function filterData(data, filters) {
	// create a 1:1 map of data
	let filtDataMap = Array.apply(null, {length: data.length}).map(Function.call, Number);
	for (let dataKey in filters) {
		let filter = filters[dataKey]
		if (filter.valid && filter.values && filter.values.length) {
			if (Array.isArray(filter.values)) {
				const values = filter.values
				filtDataMap = filtDataMap.filter(i => values.includes(data[i][dataKey]))
			}
			else {
				let value = filter.values
				if (value[0] === '/') {
					filtDataMap = filterRegex(filtDataMap, data, dataKey, value)
				}
				else if (filter.type === FilterType.CLAUSE) {
					filtDataMap = filterClause(filtDataMap, data, dataKey, value)
				}
				else if (filter.type === FilterType.NUMERIC || filter.type === FilterType.PAGE) {
					if (value[0] === '<' || value[0] === '>') {
						filtDataMap = filterNumericRange(filtDataMap, data, dataKey, value)
					}
					else if (filter.type === FilterType.PAGE) {
						filtDataMap = filterPage(filtDataMap, data, dataKey, value)
					}
					else {
						filtDataMap = filterNumeric(filtDataMap, data, dataKey, value)
					}
				}
				else {
					if (value[0] === '=') {	// exact match
						value = value.replace('=', '');
						filtDataMap = filtDataMap.filter(i => contains(value, data[i][dataKey], true, false))
					}
					else if (value[0] === '!') { // not containing
						value = value.replace('!', '');
						filtDataMap = filtDataMap.filter(i => !contains(value, data[i][dataKey], false, false))
					}
					else { // simple search
						filtDataMap = filtDataMap.filter(i => contains(value, data[i][dataKey], false, false))
					}
				}
			}
		}
	}
	return filtDataMap
}

export function filterSetValue(filter, value) {
	return {
		...filter,
		valid: Array.isArray(value)? true: filterValidate(filter.type, value),
		values: value
	}
}

export function filterCreate(type, values = '') {

	if (!filterTypeValid(type)) {
		throw new Error('Invalid filter type')
	}

	return {
		type,
		values,
		valid: Array.isArray(values)? true: filterValidate(type, values),
	}
}

function filterTypeValid(type) {
	return Object.values(FilterType).includes(type)
}

export const FilterType = {
	NUMERIC: 0,
	STRING: 1,
	CLAUSE: 2,
	PAGE: 3
}
