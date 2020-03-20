// filter.js - filter utility
//
// Shamelessly stolen from https://github.com/koalyptus/TableFilter
//

const isNumber =
	(obj) => Object.prototype.toString.call(obj) === '[object Number]';

const parseNumber = (value, decimal = '.') => {
	// Return the value as-is if it's already a number
	if (isNumber(value)) {
		return value;
	}

	// Build regex to strip out everything except digits, decimal point and
	// minus sign
	let regex = new RegExp('[^0-9-' + decimal + ']', ['g']);
	let unformatted = parseFloat(
		('' + value)
			// replace bracketed values with negatives
			.replace(/\((.*)\)/, '-$1')
			// strip out any cruft
			.replace(regex, '')
			// make sure decimal point is standard
			.replace(decimal, '.')
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

function filterCol(dataMap, data, dataKey, filtStr) {
	switch (dataKey) {
		case 'Clause':
			let len = filtStr.length;
			if (len && filtStr[len-1] === '.') {
				len = len-1;
			}
			return dataMap.filter(i => {
				let d = data[i][dataKey];
				return d === filtStr || (d && d.substring(0, len) === filtStr.substring(0, len) && d[len] === '.')
			})

		default:
			if (filtStr[0] === '/') {
				var parts = filtStr.split('/'),
				regex = filtStr,
				options = "";
				if (parts.length > 1) {
					regex = parts[1];
					options = parts[2];
				}
				let rgx = new RegExp(regex, options);
				return dataMap.filter(i => rgx.test(data[i][dataKey]))
			}
			else if (filtStr[0] === '<' || filtStr[0] === '>') {
				let result = /^(<=|>=|<|>)(.*)/.exec(filtStr)
				let compVal = parseNumber(result[2])
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
		    else if (/^!/.test(filtStr)) {	// not containing
				let compStr = filtStr.replace('!', '');
				return dataMap.filter(i => !contains(compStr, data[i][dataKey], false, false))
			}
			else if (/^=/.test(filtStr)) {	// exact match
				let compStr = filtStr.replace('=', '');
				return dataMap.filter(i => contains(compStr, data[i][dataKey], true, false))
			}
			// simple search
			return dataMap.filter(i => contains(filtStr, data[i][dataKey], false, false))
	}
}

export function filterValidate(dataKey, filtStr) {
	var valid = true
	if (filtStr.length && dataKey !== 'Clause') {
		if (filtStr[0] === '/') {	// regex
			var parts = filtStr.split('/'),
				regex = filtStr,
				options = "";
			if (parts.length > 1) {
				regex = parts[1];
				options = parts[2];
			}
			try {
				new RegExp(regex, options)
			}
			catch(e) {
				valid = false
			}
		}
		else if (filtStr[0] === '<' || filtStr[0] === '>') {
			const result = /^(<=|>=|<|>)(.*)/.exec(filtStr)
			console.log(isNaN(parseFloat(result[2])))
			valid = !isNaN(parseFloat(result[2]))
		}
	}
	return {filtStr, valid}
}

export function filterData(data, filters) {
	// create a 1:1 map of data
	let filtDataMap = Array.apply(null, {length: data.length}).map(Function.call, Number);
	for (let dataKey in filters) {
		if (filters[dataKey].valid && filters[dataKey].filtStr.length) {
			filtDataMap = filterCol(filtDataMap, data, dataKey, filters[dataKey].filtStr);
		}
	}
	return filtDataMap;
}

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

/*
 * Determine if all items in map have been selected
 */
export function allSelected(selectedList, dataMap, data, idKey) {
	var allSelected = dataMap.length > 0; // not if list is empty
	for (var i = 0; i < dataMap.length; i++) {
		if (selectedList.indexOf(data[dataMap[i]][idKey]) < 0) {
			allSelected = false;
		}
	}
	return allSelected;
}

export function toggleVisible(currSelectedList, dataMap, data, idKey) {
	let selectedList = currSelectedList.slice();
	if (allSelected(selectedList, dataMap, data, idKey)) {
		// remove all visible (filtered) IDs
		for (let i = 0; i < dataMap.length; i++) {
			let id = data[dataMap[i]][idKey];
			let j = selectedList.indexOf(id)
			if (j > -1) {
				selectedList.splice(j, 1);
			}
		}
	}
	else {
		// insert all visible (filtered) IDs if not already present
		for (let i = 0; i < dataMap.length; i++) {
			let id = data[dataMap[i]][idKey];
			if (selectedList.indexOf(id) < 0) {
				selectedList.push(id)
			}
		}
	}
	return selectedList;
}

export function updateSelected(origSelected, origData, newData, key) {
	let newSelected = []
	for (let s of origSelected) {
		const value = origData[s][key]
		const i = newData.findIndex(c => c[key] === value)
		if (i !== -1) {
			newSelected.push(i)
		}
	}
	return newSelected
}

export function shallowDiff(originalObj, modifiedObj) {
	let changed = {};
	for (let k in modifiedObj) {
 		if (modifiedObj.hasOwnProperty(k) && modifiedObj[k] !== originalObj[k]) {
 			changed[k] = modifiedObj[k]
 		}
 	}
 	return changed;
}

