import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './fetcher'

import sortReducer, {sortInit, SortDirection, SortType} from './sort'
import filtersReducer, {filtersInit, FilterType} from './filters'
import selectedReducer, {setSelected} from './selected'
import uiReducer from './ui'

const votingPoolFields = ['PoolType', 'VotingPoolID', 'VoterCount'];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = votingPoolFields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = votingPoolFields.reduce((entries, dataKey) => {
	const type = dataKey === 'VoterCount'? SortType.NUMERIC: SortType.STRING;
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});

const dataAdapter = createEntityAdapter({
	selectId: vp => vp.VotingPoolID,
	sortComparer: (vp1, vp2) => vp1.VotingPoolID.localeCompare(vp2.VotingPoolID)
});

const dataSet = 'votingPools'

const votingPoolsSlice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		sort: sortReducer(undefined, sortInit(defaultSortEntries)),
		filters: filtersReducer(undefined, filtersInit(defaultFiltersEntries)),
		selected: selectedReducer(undefined, {}),
		ui: uiReducer(undefined, {})		
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
		getSuccess(state, action) {
			const {votingPools} = action.payload;
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, votingPools);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		removeMany(state, action) {
			const {votingPools} = action.payload;
			dataAdapter.removeMany(state, votingPools);
		}
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => ['voters/addOne', 'voters/updateOne', 'voters/deleteMany'].includes(action.type),
			(state, action) => {
				const {votingPool} = action.payload;
				dataAdapter.upsertOne(state, votingPool);
			}
		)
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/'),
			(state, action) => {
				const sliceAction = {...action, type: action.type.replace(dataSet + '/', '')}
				state.sort = sortReducer(state.sort, sliceAction);
				state.filters = filtersReducer(state.filters, sliceAction);
				state.selected = selectedReducer(state.selected, sliceAction);
				state.ui = uiReducer(state.ui, sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default votingPoolsSlice.reducer;

function updateIdList(votingPools, selected) {
	const changed = selected.reduce(
		(result, id) => result || !votingPools.find(vp => vp.VotingPoolID === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !votingPools.find(vp => vp.VotingPoolID === id))
}

const {getPending, getSuccess, getFailure} = votingPoolsSlice.actions;

export function getVotingPools() {
	return async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return null
		dispatch(getPending())
		let response;
		try {
			response = await fetcher.get('/api/votingPools')
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get voting pool list', error))
			])
		}
		const {votingPools} = response;
		const {selected} = getState()[dataSet]
		const newSelected = updateIdList(votingPools, selected)
		const p = []
		if (newSelected !== selected)
			p.push(dispatch(setSelected(dataSet, newSelected)))
		p.push(dispatch(getSuccess({votingPools})))
		return Promise.all(p)
	}
}

const {removeMany} = votingPoolsSlice.actions;

export function deleteVotingPools(votingPools) {
	return async (dispatch, getState) => {
		try {
			await fetcher.delete('/api/votingPools', votingPools)
		}
		catch(error) {
			return dispatch(setError('Unable to delete voting pool(s)', error))
		}
		const {selected} = getState()[dataSet]
		const newSelected = selected.filter(id => !votingPools.find(vp => vp.VotingPoolID === id))
		return Promise.all([
			dispatch(removeMany({votingPools})),
			dispatch(setSelected(dataSet, newSelected))
		])
	}
}
