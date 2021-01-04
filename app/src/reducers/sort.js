import {
	SORT_INIT,
	SORT_SET,
	SORT_CLICK,
	SortDirection
} from '../actions/sort'

function sortClick(sort, dataKey, event) {
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

function sortSet(state, dataKey, direction) {
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

function sortInit(entries) {
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

const defaultState = {
	by: [],
	sorts: {}
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