import {createCachedSelector} from 're-reselect'
import {sortData} from '../lib/sort'
import {filterData} from '../reducers/filter'
import {getSyncedEpolls} from './epolls'

const getData = (state, dataSet) => dataSet === 'epolls'? getSyncedEpolls(state): state[dataSet][dataSet]
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
	(state, dataSet) => dataSet
);
