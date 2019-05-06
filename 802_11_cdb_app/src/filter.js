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
	switch (dataKey) {
		case 'Clause':
			let len = filtStr.length;
			if (len && filtStr[len-1] === '.') {
				len = len-1;
			}
			return dataMap.filter(i => {
				let d = data[i][dataKey];
				return d === filtStr || (d.substring(0, len) === filtStr.substring(0, len) && d[len] === '.')
			})

		default:
			if (/^\/.*\/$/.test(filtStr)) {
				let rgx = new RegExp(filtStr.replace(/^\//, '').replace(/\/$/, ''));
				return dataMap.filter(i => rgx.test(data[i][dataKey]))
			}
			else if (/^<=/.test(filtStr)) {	// less than or equal to
				let compVal = parseNumber(filtStr.replace('<=', ''));
				return dataMap.filter(i => data[i][dataKey] <= compVal)
			}
			else if (/^>=/.test(filtStr)) {	// greater than or equal to
				let compVal = parseNumber(filtStr.replace('>=', ''));
				return dataMap.filter(i => data[i][dataKey] >= compVal)
			}
			else if (/^</.test(filtStr)) {	// less than
				let compVal = parseNumber(filtStr.replace('<', ''));
				return dataMap.filter(i => data[i][dataKey] < compVal)
			}
			else if (/^>/.test(filtStr)) {	// greater than
				let compVal = parseNumber(filtStr.replace('<', ''));
				return dataMap.filter(i => data[i][dataKey] > compVal)
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

/*
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
*/
/*
export function DeleteIcon(props) {
	return (
		<svg id="delete" viewBox="0 0 473 473" {...props}>
		<g>
			<path d="M324.285,215.015V128h20V38h-98.384V0H132.669v38H34.285v90h20v305h161.523c23.578,24.635,56.766,40,93.477,40
				c71.368,0,129.43-58.062,129.43-129.43C438.715,277.276,388.612,222.474,324.285,215.015z M294.285,215.015
				c-18.052,2.093-34.982,7.911-50,16.669V128h50V215.015z M162.669,30h53.232v8h-53.232V30z M64.285,68h250v30h-250V68z M84.285,128
				h50v275h-50V128z M164.285,403V128h50v127.768c-21.356,23.089-34.429,53.946-34.429,87.802c0,21.411,5.231,41.622,14.475,59.43
				H164.285z M309.285,443c-54.826,0-99.429-44.604-99.429-99.43s44.604-99.429,99.429-99.429s99.43,44.604,99.43,99.429
				S364.111,443,309.285,443z"/>
			<polygon points="342.248,289.395 309.285,322.358 276.323,289.395 255.11,310.608 288.073,343.571 255.11,376.533 276.323,397.746 
				309.285,364.783 342.248,397.746 363.461,376.533 330.498,343.571 363.461,310.608"/>
		</g>
		</svg>
	)
}

export function RefreshIcon(props) {
	return (
		<svg id="refresh" viewBox="0 0 48 48" {...props}>
			<path d="M35.3 12.7C32.41 9.8 28.42 8 24 8 15.16 8 8.02 15.16 8.02 24S15.16 40 24 40c7.45 0 13.69-5.1 15.46-12H35.3c-1.65 
				4.66-6.07 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.31 0 6.28 1.38 8.45 3.55L26 22h14V8l-4.7 4.7z" />
		</svg>
	)
}

export function AddIcon(props) {
	return (
		<svg id="plus" viewBox="0 0 24 24" {...props}>
			<g fill="transparent" stroke="black" strokeWidth="3">
				<path d="M12 3 v18 M3 12 h18" />
			</g>
		</svg>
	)
}

export function UploadIcon(props) {
	return (
		<svg id="upload" viewBox="0 0 1000 1000" {...props}>
		<g>
		<path d="M987.4,853.3c4.2,16.3,3.3,31.7-2.6,46.3c-5.9,14.6-15.1,27.4-27.6,38.6s-27.8,20-45.8,26.4c-18,6.4-37.5,9.7-58.3,9.7c-131.2,0.7-248.5,1-351.9,1H147.3c-25,0-47-4.4-66.1-13.2c-19.1-8.8-34.4-19.7-45.8-32.5c-11.5-12.9-19.1-26.9-22.9-42.2c-3.8-15.2-3.3-29,1.6-41.2c4.2-9.5,8.3-19.3,12.5-29.5c3.5-8.8,7.6-18.8,12.5-30c4.9-11.2,10.1-22.5,15.6-34.1l39.6-93.5h118.7l-44.8,128.1h670.4l-44.8-128.1h113.5c14.6,34.6,27.8,65.7,39.6,93.5c4.9,12.2,9.7,24.1,14.6,35.6c4.9,11.5,9.2,21.9,13,31s6.9,16.9,9.4,23.4C986.2,849,987.4,852.6,987.4,853.3z M531.3,46.6c13.2,14.9,28.3,33.5,45.3,55.9s34.5,45.4,52.6,69.1c18,23.7,35.9,47.1,53.6,70.1c17.7,23,33.5,43,47.4,60c16,18.3,22.2,33.4,18.7,45.2c-3.5,11.9-15.3,17.8-35.4,17.8c-11.1-0.7-26-0.5-44.8,0.5c-18.7,1-34.4,1.5-46.8,1.5c-13.9,0-22.6,4.1-26,12.2c-3.5,8.1-5.2,19-5.2,32.5c0,14.9,0.2,31.3,0.5,49.3c0.3,18,0.5,36.4,0.5,55.4c0,19,0.2,37.6,0.5,55.9s0.5,35.2,0.5,50.8c0,6.8-0.5,13.9-1.6,21.3c-1,7.5-3.5,14.2-7.3,20.3s-9.4,11.2-16.7,15.2S550,686,537.5,686c-14.6,0-27.9,0.2-40.1,0.5c-12.1,0.3-26.2,0.5-42.2,0.5c-22.9,0-38.3-5.3-46.3-15.8c-8-10.5-12.3-27.3-13-50.3v-39.6c0-15.6-0.2-32.2-0.5-49.8c-0.3-17.6-0.5-35.2-0.5-52.9v-47.8c0-19.7-2.1-35.4-6.2-47.3c-4.2-11.9-13.5-17.5-28.1-16.8c-10.4,0-23.1-0.3-38-1c-14.9-0.7-27.9-1-39-1c-18.7,0-30.7-4.9-35.9-14.7c-5.2-9.8-1.6-22.5,10.9-38.1c13.2-16.3,28.5-35.9,45.8-59c17.4-23,35.2-46.9,53.6-71.7c18.4-24.7,36.4-48.8,54.1-72.2s33.5-43.5,47.4-60.5c12.5-15.6,24.5-23.6,35.9-23.9C506.8,24.4,518.8,31.7,531.3,46.6z"/>
		</g>
		</svg>
	)
}
export function SortIndicator(props) {
  const {sortDirection, onClick, ...otherProps} = props;

  return (
    <svg width={8} height={16} viewBox="0 0 30 48" onClick={onClick} {...otherProps}>
      {sortDirection === 'ASC'?
      	(<path d="M25.7,27.3c0,0-2.1,2.1-4.2,4.2V8.2h-5.9v23.4c-2.1-2.1-4.2-4.2-4.2-4.2l-4.2,4.2l9.3,9.3c1.2,1.2,3,1.2,4.2,0l9.3-9.3l-4.2-4.2z"/>):
         (sortDirection === 'DESC'?
         	(<path d="M11.2,22.5c0,0,2.1-2.1,4.2-4.2v23.4h5.9V18.3c2.1,2.1,4.2,4.2,4.2,4.2l4.2-4.2l-9.3-9.3c-1.2-1.2-3-1.2-4.2,0L7,18.4l4.2,4.2z"/>):
             null)}
      <path d="M0 0h24v24H0z" fill="none" />
    </svg>
    );
}

export function ExpandIcon(props) {
	const {showPlus, ...otherProps} = props;
	return (
		<svg width={18} height={18} aria-label={showPlus? 'Expand': 'Shrink'} {...otherProps}>
			<g stroke='black'>
			<circle cx={9} cy={9} r={8} strokeWidth={1} fill='none'/>
			<path
				d={showPlus? 'M 4,9 h 10 M 9,4 v 10': 'M 4,9 h 10'}
				strokeWidth={2}
				strokeLinecap='round'
			/>
			</g>
		</svg>
	)
}
*/
