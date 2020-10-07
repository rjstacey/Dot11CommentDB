import {createCachedSelector} from 're-reselect'
import {sortData} from '../reducers/sort'
import {filterData} from '../reducers/filter'

const getData = (state, dataSet) => state[dataSet][dataSet]
const getSort = (state, dataSet) => state[dataSet].sort
const getFilters = (state, dataSet) => state[dataSet].filters

/*
 * Generate the data map (map of sorted and filtered data)
 */
export const getDataMap = createCachedSelector(
	getData,
	getSort,
	getFilters,
	(data, sort, filters) => sortData(sort, filterData(data, filters), data)
)(
	(_state_, dataSet) => dataSet
);
