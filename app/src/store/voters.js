import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './fetcher'

import sortsSlice, {sortInit, SortDirection, SortType} from './sort'
import filtersSlice, {filtersInit, FilterType} from './filters'
import selectedSlice, {setSelected} from './selected'
import uiSlice from './ui'

const voterFields = ['SAPIN', 'Email', 'Name', 'LastName', 'FirstName', 'MI', 'Status'];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = voterFields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}}
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = voterFields.reduce((entries, dataKey) => {
	const type = dataKey === 'SAPIN'? SortType.NUMERIC: SortType.STRING
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});

const dataAdapter = createEntityAdapter({
	selectId: v => v.SAPIN,
	sortComparer: (v1, v2) => v1.SAPIN - v2.SAPIN
});

const dataSet = 'voters';

const votersSlice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		votingPool: {VotingPool: '', PoolType: '', VotersCount: 0},
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
			state.votingPool = {
				VotingPool: action.payload.votingPoolId,
				PoolType: action.payload.votingPoolType,
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
		},
		getFailure(state, action) {
			state.loading = false;
		},
		addOne(state, action) {
			const {votingPool, voter} = action.payload;
			if (votingPool.PoolType === state.votingPool.PoolType &&
				votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				dataAdapter.addOne(state, voter);
				state.votingPool = votingPool;
			}
		},
		updateOne(state, action) {
			const {votingPool, voterId, voter} = action.payload;
			if (votingPool.PoolType === state.votingPool.PoolType &&
				votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				dataAdapter.updateOne(state, {id: voterId, changes: voter});
				state.votingPool = votingPool;
			}
		},
		deleteMany(state, action) {
			const {votingPool, voterIds} = action.payload;
			if (votingPool.PoolType === state.votingPool.PoolType &&
				votingPool.VotingPoolID === state.votingPool.VotingPoolID) {
				dataAdapter.removeMany(state, voterIds);
				state.votingPool = votingPool;
			}
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
export default votersSlice.reducer;

/*
 * Actions
 */
function updateIdList(votingPoolType, voters, selected) {
	const idKey = votingPoolType = 'WG'? 'SAPIN': 'Email'
	const changed = selected.reduce(
		(result, id) => result || !voters.find(v => v[idKey] === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !voters.find(v => v[idKey] === id))
}

const {getPending, getSuccess, getFailure} = votersSlice.actions;

export function loadVoters(votingPoolType, votingPoolId) {
	return async (dispatch, getState) => {
		dispatch(getPending({votingPoolType, votingPoolId}))
		let response;
		try {
			response = await fetcher.get(`/api/voters/${votingPoolType}/${votingPoolId}`)
		}
		catch(error) {
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get voters for ${votingPoolId}`, error))
			])
		}
		const {votingPool, voters} = response;
		const p = []
		const {selected} = getState()[dataSet]
		const newSelected = updateIdList(votingPoolType, voters, selected)
		if (newSelected !== selected)
			p.push(dispatch(setSelected(dataSet, newSelected)))
		p.push(dispatch(getSuccess({votingPool, voters})))
		return Promise.all(p)
	}
}

const {deleteMany} = votersSlice.actions;

export function deleteVoters(votingPoolType, votingPoolId, voterIds) {
	return async (dispatch, getState) => {
		const idArrayName = votingPoolType === 'SA'? 'Emails': 'SAPINs'
		let response;
		try {
			response = await fetcher.delete(`/api/voters/${votingPoolType}/${votingPoolId}`, {[idArrayName]: voterIds})
		}
		catch(error) {
			return dispatch(setError(`Unable to delete voters in voting pool ${votingPoolId}`, error))
		}
		const {votingPool} = response;
		const {selected} = getState()[dataSet]
		const newSelected = selected.filter(id => !voterIds.includes(id))
		return Promise.all([
			dispatch(setSelected(dataSet, newSelected)),
			dispatch(deleteMany({votingPool, voterIds}))
		])
	}
}

export function uploadVoters(votingPoolType, votingPoolId, file) {
	return async (dispatch) => {
		dispatch(get(votingPoolType, votingPoolId))
		dispatch(setSelected(dataSet, []))
		let formData = new FormData()
		formData.append("VotersFile", file)
		let response;
		try {
			response = await fetcher.postMultipart(`/api/votersUpload/${votingPoolType}/${votingPoolId}`, {VotersFile: file})
		}
		catch(error) {
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to upload voters for voting pool ${votingPoolId}`, error))
			])
		}
		const {voters, votingPool} = response;
		return dispatch(getSuccess(votingPool, voters))
	}
}

const {addOne} = votersSlice.actions;

export function addVoter(votingPoolType, votingPoolId, voter) {
	return async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(`/api/voter/${votingPoolType}/${votingPoolId}`, voter)
		}
		catch(error) {
			console.warn(error)
			return dispatch(setError('Unable to add voter', error))
		}
		const {votingPool, voter: updatedVoter} = response;
		return dispatch(addOne({votingPool, voter: updatedVoter}))
	}
}

const {updateOne} = votersSlice.actions;

export function updateVoter(votingPoolType, votingPoolId, voterId, voter) {
	return async (dispatch) => {
		let response;
		try {
			response = await fetcher.put(`/api/voter/${votingPoolType}/${votingPoolId}/${voterId}`, voter)
		}
		catch(error) {
			return dispatch(setError('Unable to update voter', error))
		}
		const {votingPool, voter: updatedVoter} = response;
		return dispatch(updateOne({votingPool, voterId, voter: updatedVoter}))
	}
}
