export function sortData(dataMap, data, sortBy, sortDirection) {
	var sortDataMap = dataMap.slice();

	sortBy.forEach(key => {
		sortDataMap.sort((a, b) => {
			if (!sortDirection[key] || sortDirection[key] === 'NONE') {
				return a - b; // Index order (= original order)
			}
			else {
				const aa = data[a];
				const bb = data[b];
				if (typeof aa[key] === 'number' && typeof bb[key] === 'number') {
					return aa[key] - bb[key];
				}
				else /*if (typeof aa[key] === 'string' && typeof bb[key] === 'string')*/ {
					const A = (aa[key] === null || aa[key] === undefined)? '': aa[key].toString().toUpperCase();
					const B = (bb[key] === null || bb[key] === undefined)? '': bb[key].toString().toUpperCase();
					if (A < B) {
						return -1;
					}
					if (A > B) {
						return 1;
					}
					return 0;
				}
			}
			//return 0;
		})
		if (sortDirection[key] === 'DESC') {
			sortDataMap.reverse()
		}
	})
	return sortDataMap;
}

export function sortClick(event, dataKey, currSortBy, currSortDirection) {
	var sortBy = currSortBy.slice()
	var sortDirection = Object.assign({}, currSortDirection)

	if (event.shiftKey) {
		// Shift + click appends a column to existing criteria
		if (sortBy.includes(dataKey)) {
			sortDirection[dataKey] = sortDirection[dataKey] === 'DESC'? 'NONE':
				(sortDirection[dataKey] === 'ASC'? 'DESC': 'ASC');
		} else {
			sortDirection[dataKey] = 'ASC';
			sortBy.unshift(dataKey);
		}
	} else if (event.ctrlKey || event.metaKey) {
		// Control + click removes column from sort (if pressent)
		const index = sortBy.indexOf(dataKey);
		if (index >= 0) {
			sortBy.splice(index, 1);
			delete sortDirection[dataKey];
		}
	} else {
		if (sortBy.includes(dataKey)) {
			sortDirection[dataKey] = sortDirection[dataKey] === 'DESC'? 'NONE':
				(sortDirection[dataKey] === 'ASC'? 'DESC': 'ASC');
		} else {
			sortDirection[dataKey] = 'ASC';
		}
		sortBy.length = 0;
		sortBy.push(dataKey);
	}
	return {sortBy, sortDirection};
}
