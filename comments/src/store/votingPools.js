import {createSelector} from '@reduxjs/toolkit';
import {fetcher} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

export const fields = {
	VotingPoolID: {label: 'VotingPoolID'},
	VoterCount: {label: 'VoterCount'}
};

export const dataSet = 'votingPools';

const selectId = vp => vp.VotingPoolID;
const sortComparer = (vp1, vp2) => vp1.VotingPoolID.localeCompare(vp2.VotingPoolID);

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	sortComparer,
	initialState: {},
	extraReducers: (builder, dataAdapter) => {
		builder
		.addMatcher(
			(action) => action.type === 'voters/setVotingPool',
			(state, action) => {
				const votingPool = action.payload;
				dataAdapter.upsertOne(state, votingPool);
			}
		);
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

/*
 * Selectors
 */
export const selectVotingPoolsState = (state) => state[dataSet];

export const selectVotingPoolsOptions = createSelector(
	selectVotingPoolsState,
	(votingPools) => {
		const {ids, entities} = votingPools;
		return ids.map(id => ({value: id, label: entities[id].VotingPoolID}));
	}
);

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	updateOne,
	upsertOne
} = slice.actions;

export const loadVotingPools = () =>
	async (dispatch, getState) => {
		if (selectVotingPoolsState(getState()).loading)
			return;
		dispatch(getPending());
		const url = '/api/votingPools';
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('votingPools'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get voting pool list', error))
			]);
			return;
		}
		await dispatch(getSuccess(response.votingPools));
	}

export const deleteVotingPools = (ids) =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete('/api/votingPools', ids);
		}
		catch(error) {
			await dispatch(setError('Unable to delete voting pool(s)', error));
			return;
		}
		await dispatch(removeMany(ids));
	}

export const updateVotingPool = (votingPoolId, changes) =>
	async (dispatch) => {
		const url = `/api/votingPools/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.patch(url, changes);
			if (typeof response !== 'object' || !response.hasOwnProperty('votingPool'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			await dispatch(setError('Unable to update voting pool', error));
			return;
		}
		await dispatch(updateOne({id: votingPoolId, changes: response.votingPool}));
		return response.votingPool;
	}

export {upsertOne as upsertVotingPool};

