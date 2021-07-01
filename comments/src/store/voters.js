import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/lib/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'

const fields = ['SAPIN', 'Email', 'Name', 'LastName', 'FirstName', 'MI', 'Status'];

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
	const type = dataKey === 'SAPIN'? SortType.NUMERIC: SortType.STRING
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});

const dataAdapter = createEntityAdapter({
	selectId: v => v.SAPIN,
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
		votingPool: {VotingPool: '', VotersCount: 0},
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, sortInit(defaultSortEntries)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, filtersInit(defaultFiltersEntries)),
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
			const {votingPool, voter} = action.payload;
			if (votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				dataAdapter.updateOne(state, {id: voter.SAPIN, changes: voter});
				state.votingPool = votingPool;
			}
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		removeMany(state, action) {
			const {votingPool, sapins} = action.payload;
			if (votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				dataAdapter.removeMany(state, sapins);
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

export function loadVoters(votingPoolId) {
	return async (dispatch) => {
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
}

const {removeMany} = slice.actions;

export function deleteVoters(votingPoolId, sapins) {
	return async (dispatch) => {
		const url = `/api/voters/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.delete(url, {sapins});
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool'))
				throw new TypeError(`Unexpected response to DELETE: ${url}`);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete voters in voting pool ${votingPoolId}`, error));
			return;
		}
		const {votingPool} = response;
		await dispatch(removeMany({votingPool, sapins}))
	}
}

export function uploadVoters(votingPoolId, file) {
	return async (dispatch) => {
		dispatch(getPending(votingPoolId));
		const url = `/api/votersUpload/${votingPoolId}`;
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
}

const {addOne} = slice.actions;

export function addVoter(votingPoolId, voter) {
	return async (dispatch) => {
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
}

const {updateOne} = slice.actions;

export function updateVoter(votingPoolId, sapin, voter) {
	return async (dispatch) => {
		const url = `/api/voter/${votingPoolId}/${sapin}`;
		let response;
		try {
			response = await fetcher.patch(url, voter);
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voter'))
				throw new TypeError(`Unexpected response to PATCH: ${url}`);
		}
		catch(error) {
			await dispatch(setError('Unable to update voter', error));
			return;
		}
		return dispatch(updateOne(response));
	}
}
