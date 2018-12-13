// filter.js - filter utility
//
// Shamlessly stolen from https://github.com/koalyptus/TableFilter
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
