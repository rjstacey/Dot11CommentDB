import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/lib/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {getSelected, setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'

const fields = ['VotingPoolID', 'VoterCount'];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = fields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = fields.reduce((entries, dataKey) => {
	const type = dataKey === 'VoterCount'? SortType.NUMERIC: SortType.STRING;
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});

/*
 * Remove entries that no longer exist from a list. If there
 * are no changes, return the original list.
 */
function filterIdList(idList, allIds) {
	const newList = idList.filter(id => allIds.includes(id));
	return newList.length === idList.length? idList: newList;
}

const dataAdapter = createEntityAdapter({
	selectId: vp => vp.VotingPoolID,
	sortComparer: (vp1, vp2) => vp1.VotingPoolID.localeCompare(vp2.VotingPoolID)
});

const dataSet = 'votingPools';

const slice = createSlice({
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
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		removeMany(state, action) {
			const votingPoolIds = action.payload;
			dataAdapter.removeMany(state, votingPoolIds);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
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
export default slice.reducer;

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadVotingPools = () =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending());
		const url = '/api/votingPools';
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPools'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get voting pool list', error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

const {removeMany} = slice.actions;

export const deleteVotingPools = (votingPools) =>
	async (dispatch, getState) => {
		const votingPoolIds = votingPools.map(vp => vp.VotingPoolID);
		try {
			await fetcher.delete('/api/votingPools', votingPoolIds);
		}
		catch(error) {
			await dispatch(setError('Unable to delete voting pool(s)', error));
			return;
		}
		await dispatch(removeMany(votingPoolIds));
	}
