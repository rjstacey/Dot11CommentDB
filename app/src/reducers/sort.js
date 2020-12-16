import {sortFunc} from '../lib/sort'
import {
	SORT_INIT,
	SORT_SET,
	SORT_CLICK,
	SortDirection
} from '../actions/sort'

export function sortData(sort, dataMap, data) {
	const {type, by, direction} = sort;
	let sortedDataMap = dataMap;

	for (let key of by) {
		let cmp = (index_a, index_b) => index_a - index_b; // Index order (= original order)
		if (direction[key] && type[key] && direction[key] !== SortDirection.NONE) {
			const cmpFunc = sortFunc[type[key]]
			if (cmpFunc)
				cmp = (index_a, index_b) => cmpFunc(data[index_a][key], data[index_b][key]);
			else
				console.warn(`No sort function for ${key} (sort type ${type[key]})`)
		}
		sortedDataMap = sortedDataMap.slice();
		sortedDataMap.sort(cmp);
		if (direction[key] === SortDirection.DESC)
			sortedDataMap.reverse();
	}

	return sortedDataMap;
}

export function sortClick(sort, dataKey, event) {
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

export function sortSet(sort, dataKey, direction) {
	const index = sort.by.indexOf(dataKey);
	if (index >= 0) {
		if (direction === SortDirection.NONE)
			return {...sort, by: sort.by.filter(d => d !== dataKey), direction: {...sort.direction, [dataKey]: SortDirection.NONE}} // remove from sort by list
		else
			return {...sort, direction: {...sort.direction, [dataKey]: direction}} // change direction
	}
	else {
		if (direction !== SortDirection.NONE)
			return {...sort, by: [...sort.by, dataKey], direction: {...sort.direction, [dataKey]: direction}} // add to sort by list
	}
	return sort
}

function sortInit(entries) {
	let sort = {...defaultState}
	if (entries) {
		for (let dataKey of Object.keys(entries)) {
			sort.type[dataKey] = entries[dataKey].type;
			sort.direction[dataKey] = entries[dataKey].direction;
		}
	}
	return sort;
}

const defaultState = {
	by: [],
	type: {},
	direction: {}
}

function sortReducer(state = defaultState, action) {

	switch (action.type) {
		case SORT_SET:
			return sortSet(state, action.dataKey, action.direction)

		case SORT_CLICK:
			return sortClick(state, action.dataKey, action.event)

		case SORT_INIT:
			return sortInit(action.entries)

		default:
			return state
	}
}

export default sortReducer