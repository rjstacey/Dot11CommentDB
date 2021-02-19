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
	if (typeof value === 'number')
		return value

	// Build regex to strip out everything except digits, decimal point and minus sign
	let regex = new RegExp('[^0-9-.]', ['g']);
	let unformatted = parseFloat((''+value).replace(regex, ''));

	// This will fail silently
	return !isNaN(unformatted)? unformatted: 0;
};

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
 * Exact if truthy true, but any truthy false will match
 */
const cmpExact = (d, val) => d? d === val: !val;

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

function filterAddValue(filter, value, filterType) {
	let compFunc, regex

	switch (filterType) {
		case FilterType.EXACT:
			compFunc = d => cmpExact(d, value);
			break;
		case FilterType.REGEX:
			compFunc = d => cmpRegex(d, value);
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

function filterRemoveValue(filter, value, filterType) {
	const newValues = filter.values.filter(v => v.value !== value || v.filterType !== filterType)
	return {
		...filter,
		values: newValues
	}
}

const filterCreate = ({options}) => ({
	options,	// Array of {label, value} objects
	values: [],	// Array of filter value objects where a filter value object is {value, valid, FilterType, compFunc}
})

function filtersInit(entries) {
	const filters = {}
	if (entries) {
		for (let dataKey of Object.keys(entries))
			filters[dataKey] = filterCreate(entries[dataKey])
	}
	return filters;
}

function filtersReducer(state = {}, action) {
	let filter

	switch (action.type) {
		case FILTER_SET:
			filter = filterCreate(state[action.dataKey])
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
			return {
				...state,
				[action.dataKey]: filterRemoveValue(state[action.dataKey], action.value, action.filterType)
			}

		case FILTER_CLEAR:
			return {
				...state,
				[action.dataKey]: filterCreate(state[action.dataKey])
			}

		case FILTER_CLEAR_ALL:
			return filtersInit(state)

		case FILTER_INIT:
			return filtersInit(action.entries)

		default:
			return state
	}
}

export default filtersReducer