import {createCachedSelector} from 're-reselect'
import {getDataMap} from './dataMap'

const getData = (state, dataSet) => state[dataSet][dataSet]
const getDataKey = (state, dataSet, dataKey) => dataKey

/*
 * Generate a list of unique value-label pairs for a particular field
 */
function fieldOptions(comments, dataKey) {
	let options
	switch (dataKey) {
		case 'MustSatisfy':
			return [{value: 0, label: 'No'}, {value: 1, label: 'Yes'}]
		default:
			// return an array of unique values for dataKey, sorted, and value '' or null labeled '<blank>'
			options = [...new Set(comments.map(c => c[dataKey]))]	// array of unique values for dataKey
				.sort()
				.map(v => ({value: v, label: (v === null || v === '')? '<blank>': v}))
			//console.log(dataKey, options)
			return options
	}
}

/*
 * Generate all field options
 */
export const getAllFieldOptions = createCachedSelector(
	getData,
	getDataKey,
	(data, dataKey) => fieldOptions(data, dataKey)
)(
	(_state_, dataSet, dataKey) => dataSet + '-' + dataKey
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
	(_state_, dataSet, dataKey) => dataSet + '-' + dataKey
)