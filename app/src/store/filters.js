// filter.js - filter utility
//
// Began life here https://github.com/koalyptus/TableFilter
//

import {createSlice} from '@reduxjs/toolkit'

export const FilterType = {
	EXACT: 0,
	CONTAINS: 1,
	REGEX: 2,
	NUMERIC: 3,
	STRING: 4,
	CLAUSE: 5,
	PAGE: 6,
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

export function filterData(filters, data, ids) {
	// create a 1:1 map of data
	let filtIds = ids.slice(); //Array.apply(null, {length: data.length}).map(Function.call, Number);
	for (const dataKey in filters) {
		const values = filters[dataKey].values
		if (values.length) {
			filtIds = filtIds.filter(id => values.reduce((result, value) => result || (value.valid && value.compFunc(data[id][dataKey])), false))
		}
	}
	return filtIds;
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

function filterNewValue(value, filterType) {
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

	return {value, valid: compFunc !== undefined, filterType, compFunc}
}

const filterCreate = ({options}) => ({
	options,	// Array of {label, value} objects
	values: [],	// Array of filter value objects where a filter value object is {value, valid, FilterType, compFunc}
})

function initFilters(entries) {
	const filters = {}
	if (entries) {
		for (let dataKey of Object.keys(entries))
			filters[dataKey] = filterCreate(entries[dataKey])
	}
	return filters;
}

const sliceName = 'filters';

const filtersSlice = createSlice({
	name: sliceName,
	initialState: {},
	reducers: {
		setAll(state, action) {
			const {dataKey, values} = action;
			const filter = filterCreate(state[dataKey]);
			for (let value of values)
				filter.values.push(filterNewValue(value, FilterType.EXACT));
			state[action.dataKey] = filter;
		},
		addOne(state, action) {
			const {dataKey, value, filterType} = action;
			state[dataKey].values.push(filterNewValue(value, filterType));
		},
		removeOne(state, action) {
			const {dataKey, value, filterType} = action;
			state[dataKey].values = state[dataKey].values.filter(v => v.value !== value || v.filterType !== filterType)
		},
		clear(state, action) {
			const {dataKey} = action;
			state[dataKey] = filterCreate(state[dataKey]);
		},
		clearAll(state, action) {
			return initFilters(state);
		},
		init(state, action) {
			return initFilters(action.entries);
		}
	}
})

export default filtersSlice;

export const setFilter = (dataSet, dataKey, values) => ({type: dataSet + '/' + sliceName + '/' + 'setAll', dataSet, dataKey, values})
export const addFilter = (dataSet, dataKey, value, filterType) => ({type: dataSet + '/' + sliceName + '/' + 'addOne', dataSet, dataKey, value, filterType})
export const removeFilter = (dataSet, dataKey, value, filterType) => ({type: dataSet + '/' + sliceName + '/' + 'removeOne', dataSet, dataKey, value, filterType})
export const clearFilter = (dataSet, dataKey) => ({type: dataSet + '/' + sliceName + '/' + 'clear', dataSet, dataKey})
export const clearAllFilters = (dataSet) => ({type: dataSet + '/' + sliceName + '/' + 'clearAll', dataSet})
export const filtersInit = (entries) => ({type: sliceName + '/' + 'init', entries})

/*
 * Selectors
 */
 export const getFilters = (state, dataSet) => state[dataSet][sliceName]
 export const getFilter = (state, dataSet, dataKey) => state[dataSet][sliceName][dataKey]
 