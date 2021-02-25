import {createSlice} from '@reduxjs/toolkit'

import {SortDirection} from './lib/sort'

export {SortDirection}

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
			return setSort(state, action.dataKey, action.direction)
		},
		click(state, action) {
			return clickSort(state, action.dataKey, action.event)
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

