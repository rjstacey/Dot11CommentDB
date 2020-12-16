// filter.js - filter utility
//
// Began life here https://github.com/koalyptus/TableFilter
//

import {
	FILTER_INIT,
	FILTER_SET,
	FILTER_ADD,
	FILTER_REMOVE,
	FILTER_CLEAR,
	FILTER_CLEAR_ALL,
	FilterType
} from '../actions/filter'

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
	return !isNaN(unformatted)? unformatted: 0;
};
/*

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


export function filterData2(data, filters) {
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
*/
export function filterData(data, filters) {
	// create a 1:1 map of data
	let filtDataMap = Array.apply(null, {length: data.length}).map(Function.call, Number);
	for (const dataKey in filters) {
		const values = filters[dataKey].values
		if (values.length) {
			filtDataMap = filtDataMap.filter(i => values.reduce((result, value) => result || (value.valid && value.compFunc(data[i][dataKey])), false))
		}
	}
	return filtDataMap;
}

/* Exact match
 */
const cmpExact = (d, val) => d === val

/* Clause match
 */
const cmpClause = (d, val) => {
	let len = val.length
	if (len && val[len-1] === '.')
		len = len - 1
	return d === val || (d && d.substring(0, len) === val.substring(0, len) && d[len] === '.')
}

/* Page match:
 * floating point number => match page and line
 * Integer value => match page
 */
const cmpPage = (d, val) => {
	const n = parseNumber(val);
	return (val.search(/\d+\./) !== -1)? d === n: Math.round(d) === n
}

const cmpRegex = (d, regex) => regex.test(d)

const getRegex = (regexStr) => {
	const parts = regexStr.split('/');
	let regex = regexStr,
		options = "";
	if (parts.length > 1) {
		regex = parts[1];
		options = parts[2];
	}
	try {
		return new RegExp(regex, options)
	}
	catch (e) {
		return null
	}
}

function filterAddValue(filter, value, filterType) {
	let compFunc, regex

	switch (filterType) {
		case FilterType.EXACT:
			compFunc = d => cmpExact(d, value);
			break;
		case FilterType.REGEX:
			regex = getRegex(value);
			if (regex) {
				compFunc = d => cmpRegex(d, regex);
			}
			break;
		case FilterType.CONTAINS:
			regex = new RegExp(value, 'i');
			compFunc = d => cmpRegex(d, regex);
			break;
		case FilterType.CLAUSE:
			compFunc = d => cmpClause(d, value);
			break;
		case FilterType.PAGE:
			compFunc = d => cmpPage(d, value);
			break;
		default:
			throw TypeError(`Unexpected filter type ${filterType}`);
	}

	return {
		...filter,
		values: [...filter.values, {value, valid: compFunc !== undefined, filterType, compFunc}]
	}
}

function filterCreate(entry) {
	const {type, options} = entry

	if (!filterTypeValid(type)) {
		throw new Error('Invalid filter type')
	}

	return {
		type,
		options,
		values: [],
		valid: true
	}
}

function filterTypeValid(type) {
	return Object.values(FilterType).includes(type)
}

function filtersInit(entries) {
	const filters = {}
	if (entries) {
		for (let dataKey of Object.keys(entries)) {
			filters[dataKey] = filterCreate(entries[dataKey])
		}
	}
	return filters;
}

function filtersReducer(state = {}, action) {
	let filter

	switch (action.type) {
		case FILTER_SET:
			filter = {...state[action.dateKey], values: []}
			for (let value of action.values)
				filter = filterAddValue(filter, value, FilterType.EXACT)
			return {
				...state,
				[action.dataKey]: filter
			}
		case FILTER_ADD:
			return {
				...state,
				[action.dataKey]: filterAddValue(state[action.dataKey], action.value, action.filterType)
			}
		case FILTER_REMOVE:
			filter = {...state[action.dataKey]}
			filter.values = filter.values.filter(v => v.value !== action.value || v.filterType !== action.filterType)
			return {
				...state,
				[action.dataKey]: filter
			}

		case FILTER_CLEAR:
			return {
				...state,
				[action.dataKey]: {...state[action.dataKey], values: []}
			}

		case FILTER_CLEAR_ALL:
			const filters = {}
			for (let dataKey in state) {
				filters[dataKey] = {...state[dataKey], values: []}
			}
			return filters

		case FILTER_INIT:
			return filtersInit(action.entries)

		default:
			return state
	}
}

export default filtersReducer