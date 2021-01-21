import {createCachedSelector} from 're-reselect'
import {getDataMap} from './dataMap'

const getData = (state, dataSet) => state[dataSet][dataSet]
const getDataKey = (state, dataSet, dataKey) => dataKey

/*
 * Generate a list of unique value-label pairs for a particular field
 */
function fieldOptions(data, dataKey) {
	// return an array of unique values for dataKey, sorted, and value '' or null labeled '(Blank)'
	const options = 
		[...new Set(data.map(c => c[dataKey] !== null? c[dataKey]: ''))]	// array of unique values for dataKey
		.map(v => ({value: v, label: v === ''? '(Blank)': v}))
	return options
}

/*
 * Generate all field options
 */
export const getAllFieldOptions = createCachedSelector(
	getData,
	getDataKey,
	(data, dataKey) => fieldOptions(data, dataKey)
)(
	(state, dataSet, dataKey) => dataSet + '-' + dataKey	// caching key
)

/*
 * Generate avaialble field options
 */
export const getAvailableFieldOptions = createCachedSelector(
	getData,
	getDataMap,
	getDataKey,
	(data, dataMap, dataKey) => fieldOptions(dataMap.map(i => data[i]), dataKey)
)(
	(state, dataSet, dataKey) => dataSet + '-' + dataKey	// caching key
)