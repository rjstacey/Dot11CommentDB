// filter.js - filter utility
//
// Shamlessly stolen from https://github.com/koalyptus/TableFilter
//
import React from 'react'

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

	let newDataMap = [];

   	switch (dataKey) {
    case 'Clause':
		dataMap.forEach(i => {
			const d = data[i][dataKey];
			const len = Math.min(d.length, filtStr.length);
	        if (d.substring(0, len) === filtStr.substring(0, len)) {
	        	newDataMap.push(i);
	        }
		})
		return newDataMap;

    default:
        let numCompFunc = undefined;
        let strCompFunc = undefined;
        let rgxCompFunc = undefined;
    	let rgx, compVal, compStr;

    	if (/^\/.*\/$/.test(filtStr)) {
    		rgx = new RegExp(filtStr.replace('^/', '').replace('/$', ''));
    		rgxCompFunc = (dataStr, rgx) => {return rgx.test(dataStr)}
    	}
    	else if (/^<=/.test(filtStr)) {	// less than or equal to
    		compVal = parseNumber(filtStr.replace('<=', ''));
    		numCompFunc = (dataVal, compVal) => {return dataVal <= compVal}
    	}
		else if (/^>=/.test(filtStr)) {	// greater than or equal to
			compVal = parseNumber(filtStr.replace('>=', ''));
			numCompFunc = (dataVal, compVal) => {return dataVal >= compVal}
		}
		else if (/^</.test(filtStr)) {	// less than
			compVal = parseNumber(filtStr.replace('<', ''));
			numCompFunc = (dataVal, compVal) => {return dataVal < compVal}
		}
		else if (/^>/.test(filtStr)) {	// greater than
			compVal = parseNumber(filtStr.replace('<', ''));
			numCompFunc = (dataVal, compVal) => {return dataVal > compVal}
		}
	    else if (/^!/.test(filtStr)) {	// not containing
	    	compStr = filtStr.replace('!', '');
	    	strCompFunc = (dataStr, compStr) => {return contains(compStr, dataStr, false, false)? false : true}
		}
		else if (/^=/.test(filtStr)) {	// exact match
			compStr = filtStr.replace('=', '');
    		strCompFunc = (dataStr, compStr) => {return contains(compStr, dataStr, true, false)}
		}
		else {
			compStr = filtStr;
			strCompFunc = (dataStr, compStr) => {return contains(compStr, dataStr, false, false)}
		}

		if (rgxCompFunc) {
			dataMap.forEach((i) => {
        		if (rgxCompFunc(data[i][dataKey], rgx)) {
            		newDataMap.push(i);
        		}
			})
        	return newDataMap;
		}
		else if (numCompFunc) {
			dataMap.forEach((i) => {
				var dataVal = parseNumber(data[i][dataKey]);
        		if (numCompFunc(dataVal, compVal)) {
            		newDataMap.push(i);
        		}
			})
        	return newDataMap;
		}
		else if (strCompFunc) {
			dataMap.forEach((i) => {
        		if (strCompFunc(data[i][dataKey], compStr)) {
            		newDataMap.push(i);
        		}
			})
        	return newDataMap;
		}
		break;
 	}
	return dataMap;
}

export function filterData(data, filters) {
	// create a 1:1 map of data
	let filtDataMap = Array.apply(null, {length: data.length}).map(Function.call, Number);
	for (let dataKey in filters) {
		if (filters[dataKey]) {
			filtDataMap = filterCol(filtDataMap, data, dataKey, filters[dataKey]);
		}
	}
	return filtDataMap;
}

export function sortData(dataMap, data, sortBy, sortDirection) {
  var sortDataMap = dataMap.slice();

  sortBy.forEach(key => {
    sortDataMap.sort((a, b) => {
      if (sortDirection[key] === 'NONE') {
        return a - b; // Index order (= original order)
      }
      else {
        const aa = data[a];
        const bb = data[b];
        if (typeof aa[key] === 'number' && typeof bb[key] === 'number') {
          return aa[key] - bb[key];
        }
        else if (typeof aa[key] === 'string' && typeof bb[key] === 'string') {
          const A = aa[key].toUpperCase();
          const B = bb[key].toUpperCase();
          if (A < B) {
            return -1;
          }
          if (A > B) {
            return 1;
          }
          return 0;
        }
      }
      return 0;
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
    if (sortDirection.hasOwnProperty(dataKey)) {
      sortDirection[dataKey] = sortDirection[dataKey] === 'NONE'? 'ASC':
        (sortDirection[dataKey] === 'ASC'? 'DESC': 'NONE');
    } else {
      sortDirection[dataKey] = 'ASC';
    }
    if (!sortBy.includes(dataKey)) {
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
    sortBy.length = 0;
    sortBy.push(dataKey);

    if (sortDirection.hasOwnProperty(dataKey)) {
      sortDirection[dataKey] = sortDirection[dataKey] === 'NONE'? 'ASC':
        (sortDirection[dataKey] === 'ASC'? 'DESC': 'NONE');
    } else {
      sortDirection[dataKey] = 'ASC';
    }
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

export function SortIndicator(props) {
  const {sortDirection, onClick, ...otherProps} = props;

  return (
    <svg width={18} height={18} viewBox="0 0 24 24" onClick={onClick} {...otherProps}>
      {sortDirection === 'ASC'?
        (<path d="M5 8 l5-5 5 5z" />):
         (sortDirection === 'DESC'?
          (<path d="M5 11 l5 5 5-5 z" />):
            (<path d="M5 8 l5-5 5 5z M5 11 l5 5 5-5 z" />))}
      <path d="M0 0h24v24H0z" fill="none" />
    </svg>
    );
}