import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './fetcher'

import sortsSlice, {sortInit, SortDirection, SortType} from './sort'
import filtersSlice, {filtersInit, FilterType} from './filters'
import selectedSlice, {setSelected} from './selected'
import uiSlice from './ui'

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
		[sortsSlice.name]: sortsSlice.reducer(undefined, sortInit(defaultSortEntries)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, filtersInit(defaultFiltersEntries)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})		
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
				state[sortsSlice.name] = sortsSlice.reducer(state[sortsSlice.name], sliceAction);
				state[filtersSlice.name] = filtersSlice.reducer(state[filtersSlice.name], sliceAction);
				state[selectedSlice.name] = selectedSlice.reducer(state[selectedSlice.name], sliceAction);
				state[uiSlice.name] = uiSlice.reducer(state[uiSlice.name], sliceAction);
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

export function loadVotingPools() {
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
