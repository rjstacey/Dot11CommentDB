import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import uiSlice from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'

export const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Email: {label: 'Email'},
	Name: {label: 'Name'},
	LastName: {label: 'LastName'},
	FirstName: {label: 'FirstName'},
	MI: {label: 'MI'},
	Status: {label: 'Status'}
};

const dataAdapter = createEntityAdapter({
	selectId: v => v.id,
	sortComparer: (v1, v2) => v1.SAPIN - v2.SAPIN
});

/*
 * Remove entries that no longer exist from a list. If there
 * are no changes, return the original list.
 */
function filterIdList(idList, allIds) {
	const newList = idList.filter(id => allIds.includes(id));
	return newList.length === idList.length? idList: newList;
}

const dataSet = 'voters';

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		votingPool: {VotingPoolID: '', VotersCount: 0},
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, initSorts(fields)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, initFilters(fields)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})	
	}),
	reducers: {
		getPending(state, action) {
			const {votingPoolId} = action.payload;
			state.loading = true;
			state.votingPool = {
				VotingPoolID: votingPoolId,
				VotersCount: 0
			};
			dataAdapter.setAll(state, []);
		},
		getSuccess(state, action) {
			const {votingPool, voters} = action.payload;
			state.loading = false;
			state.valid = true;
			state.votingPool = votingPool;
			dataAdapter.setAll(state, voters);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
			state[selectedSlice.name] = [];
		},
		addOne(state, action) {
			const {votingPool, voter} = action.payload;
			if (votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				dataAdapter.addOne(state, voter);
				state.votingPool = votingPool;
			}
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		updateOne(state, action) {
			const {id, voter} = action.payload;
			dataAdapter.updateOne(state, {id, changes: voter});
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		removeMany(state, action) {
			const {votingPool, ids} = action.payload;
			if (votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				dataAdapter.removeMany(state, ids);
				state.votingPool = votingPool;
			}
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		}
	},
	extraReducers: builder => {
		builder
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

/*
 * Actions
 */
const {getPending, getSuccess, getFailure} = slice.actions;

export const loadVoters = (votingPoolId) =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending({votingPoolId}));
		const url = `/api/voters/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get voters for ${votingPoolId}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

const {removeMany} = slice.actions;

export const deleteVoters = (votingPoolId, ids) =>
	async (dispatch) => {
		const url = `/api/voters/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.delete(url, ids);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool'))
				throw new TypeError(`Unexpected response to DELETE: ${url}`);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete voters in voting pool ${votingPoolId}`, error));
			return;
		}
		const {votingPool} = response;
		await dispatch(removeMany({votingPool, ids}))
	}

export const votersFromSpreadsheet = (votingPoolId, file) =>
	async (dispatch) => {
		dispatch(getPending({votingPoolId}));
		const url = `/api/voters/${votingPoolId}/upload`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to upload voters for voting pool ${votingPoolId}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

export const votersFromMembersSnapshot = (votingPoolId, date) =>
	async (dispatch) => {
		dispatch(getPending({votingPoolId}));
		const url = `/api/voters/${votingPoolId}/membersSnapshot`;
		let response;
		try {
			response = await fetcher.post(url, {date});
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to create voting pool ${votingPoolId}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

const {addOne} = slice.actions;

export const addVoter = (votingPoolId, voter) =>
	async (dispatch) => {
		const url = `/api/voter/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.post(url, voter);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voter'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			console.warn(error)
			await dispatch(setError('Unable to add voter', error));
			return;
		}
		await dispatch(addOne(response));
	}

const {updateOne} = slice.actions;

export const updateVoter = (votingPoolId, sapin, voter) =>
	async (dispatch) => {
		const url = `/api/voter/${votingPoolId}/${sapin}`;
		let response;
		try {
			response = await fetcher.patch(url, voter);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('voter'))
				throw new TypeError(`Unexpected response to PATCH: ${url}`);
		}
		catch(error) {
			await dispatch(setError('Unable to update voter', error));
			return;
		}
		await dispatch(updateOne({id: response.voter.id, voter: response.voter}));
	}
