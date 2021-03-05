import {createSlice} from '@reduxjs/toolkit'

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

export function sortData(sortState, data, ids) {
	let sortedIds = ids;

	sortState.by.forEach(key => {
		const {direction, type} = sortState.sorts[key];
		if (direction !== SortDirection.ASC && direction !== SortDirection.DESC)
			return
		const cmpFunc = sortFunc[type]
		if (!cmpFunc) {
			console.warn(`No sort function for ${key} (sort type ${type[key]})`);
			return
		}
		const cmp = (id_a, id_b) => cmpFunc(data[id_a][key], data[id_b][key]);
		sortedIds = sortedIds.slice();
		sortedIds.sort(cmp);
		if (direction === SortDirection.DESC)
			sortedIds.reverse();
	});

	return sortedIds;
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

function clickSort(sort, dataKey, event) {
	let by = sort.by
	let direction = sort.direction

	if (event.shiftKey) {
		// Shift + click appends a column to existing criteria
		if (by.includes(dataKey)) {
			// Already present; must be ASC or DESC
			if (direction[dataKey] === SortDirection.ASC)
				direction = {...direction, [dataKey]: SortDirection.DESC}; // toggle ASC -> DESC
			else
				by = by.filter(d => d !== dataKey) // toggle DESC -> removed
		}
		else {
			// Not present; add entry as ASC
			direction[dataKey] = SortDirection.ASC;
			by = [...by, dataKey];
		}
	}
	else if (event.ctrlKey || event.metaKey) {
		// Control + click removes column from sort (if present)
		by = by.filter(d => d !== dataKey);
	}
	else {
		// Click without modifier adds as only entry or toggles if already present
		if (by.includes(dataKey)) {
			// Already present; must be ASC or DESC
			if (direction[dataKey] === SortDirection.ASC) {
				direction = {...direction, [dataKey]: SortDirection.DESC}; // toggle ASC -> DESC
				by = [dataKey];
			}
			else {
				by = []; // toggle DESC -> removed
			}
		}
		else {
			// Not present; add entry as ASC
			direction[dataKey] = SortDirection.ASC;
			by = [dataKey];
		}
	}

	return {...sort, by, direction};
}

function setSort(state, dataKey, direction) {
	let by = state.by;
	if (by.indexOf(dataKey) >= 0) {
		if (direction === SortDirection.NONE)
			by = by.filter(d => d !== dataKey) // remove from sort by list
	}
	else {
		by = by.slice();
		by.push(dataKey);
	}
	const sorts = {...state.sorts, [dataKey]: {...state.sorts[dataKey], direction}};
	return {...state, by, sorts}
}

function initSort(entries) {
	const sorts = {};
	if (entries) {
		Object.keys(entries).forEach(dataKey => {
			sorts[dataKey] = {
				type: entries[dataKey].type,
				direction: entries[dataKey].direction
			}
		});
	}
	return {by: [], sorts};
}

const sliceName = 'sort';

const sortSlice = createSlice({
	name: sliceName,
	initialState: {
		by: [],
		sorts: {}
	},
	reducers: {
		set(state, action) {
			const {dataKey, direction} = action;
			return setSort(state, dataKey, direction)
		},
		click(state, action) {
			const {dataKey, event} = action;
			return clickSort(state, dataKey, event)
		},
		init(state, action) {
			return initSort(action.entries)
		}
	}
})

export default sortSlice.reducer

export const sortSet = (dataSet, dataKey, direction) => ({type: dataSet + '/' + sliceName + '/set', dataKey, direction})
export const sortClick = (dataSet, dataKey, event) => ({type: dataSet + '/' + sliceName + '/click', dataSet, dataKey, event})
export const sortInit = (entries) => ({type: sliceName + '/' + 'init', entries})

export const isSortable = (sort, dataKey) => sort.hasOwnProperty(dataKey)

