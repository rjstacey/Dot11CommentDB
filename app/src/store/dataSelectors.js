import {createCachedSelector} from 're-reselect'
import {getSorts, sortData} from './sort'
import {getFilters, filterData} from './filters'

export const getEntities = (state, dataSet) => state[dataSet].entities
export const getIds = (state, dataSet) => state[dataSet].ids

/*
 * getData(state, dataSet) selector
 * returns array of all data objects
 */
export const getData = createCachedSelector(
	getEntities,
	getIds,
	(entities, ids) => ids.map(id => entities[id])
)(
	(state, dataSet) => dataSet
)

/*
 * getSortedFilteredIds(state, dataSet) selector
 * returns array of sorted and filtered ids
 */
export const getSortedFilteredIds = createCachedSelector(
	getEntities,
	getIds,
	getSorts,
	getFilters,
	(entities, ids, sort, filters) => sortData(sort, entities, filterData(filters, entities, ids))
)(
	(state, dataSet) => dataSet
);

/*
 * getSortedFilteredData(state, dataSet)
 * returns array of sorted and filtered data objects
 */
export const getSortedFilteredData = createCachedSelector(
	getEntities,
	getSortedFilteredIds,
	(entities, ids) => ids.map(id => entities[id])
)(
	(state, dataSet) => dataSet
);

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
 * getAllFieldOptions(state, dataSet, dataKey) selector
 * Generate all field options as array of objects with shape {value, label}
 */
export const getAllFieldOptions = createCachedSelector(
	getData,
	getDataKey,
	(data, dataKey) => fieldOptions(data, dataKey)
)(
	(state, dataSet, dataKey) => dataSet + '-' + dataKey	// caching key
)

/*
 * getAvailableFieldOptions(state, dataSet, dataKey) selector
 * Generate available field options as array of objects with shape {value, label}
 */
export const getAvailableFieldOptions = createCachedSelector(
	getSortedFilteredData,
	getDataKey,
	(data, dataKey) => fieldOptions(data, dataKey)
)(
	(state, dataSet, dataKey) => dataSet + '-' + dataKey	// caching key
)
