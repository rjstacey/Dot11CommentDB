import { createSelector } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	createAppTableDataSlice, SortType, getAppTableDataSelectors
} from 'dot11-components';
import type { AppThunk, RootState } from '.';

export type VotingPool = {
	VotingPoolID: string;
	VoterCount: number;
}

export const fields = {
	VotingPoolID: {label: 'VotingPoolID'},
	VoterCount: {label: 'VoterCount', sortType: SortType.NUMERIC}
};

export const dataSet = 'votingPools';

const selectId = (vp: VotingPool) => vp.VotingPoolID;
const sortComparer = (vp1: VotingPool, vp2: VotingPool) => vp1.VotingPoolID.localeCompare(vp2.VotingPoolID);

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	sortComparer,
	initialState: {},
	reducers: {},
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

export default slice;

/*
 * Selectors
 */
export const selectVotingPoolsState = (state: RootState) => state[dataSet];
const selectVotingPoolEntities = (state: RootState) => selectVotingPoolsState(state).entities;
const selectVotingPoolIds = (state: RootState) => selectVotingPoolsState(state).ids;

export const selectVotingPoolsOptions = createSelector(
	selectVotingPoolIds,
	selectVotingPoolEntities,
	(ids, entities) => ids.map(id => ({value: id, label: entities[id]!.VotingPoolID}))
);

export const votingPoolsSelectors = getAppTableDataSelectors(selectVotingPoolsState);

/*
 * Actions
 */
export const votingPoolsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	updateOne,
	upsertOne
} = slice.actions;

export const loadVotingPools = (): AppThunk =>
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
			dispatch(getFailure());
			dispatch(setError('Unable to get voting pool list', error));
			return;
		}
		dispatch(getSuccess(response.votingPools));
	}

export const deleteVotingPools = (ids: string[]): AppThunk =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete('/api/votingPools', ids);
		}
		catch(error) {
			dispatch(setError('Unable to delete voting pool(s)', error));
			return;
		}
		dispatch(removeMany(ids));
	}

export const updateVotingPool = (votingPoolId: string, changes: Partial<VotingPool>): AppThunk<VotingPool> =>
	async (dispatch) => {
		const url = `/api/votingPools/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.patch(url, changes);
			if (typeof response !== 'object' || !response.hasOwnProperty('votingPool'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			dispatch(setError('Unable to update voting pool', error));
			return;
		}
		dispatch(updateOne({id: votingPoolId, changes: response.votingPool}));
		return response.votingPool;
	}

export {upsertOne as upsertVotingPool};

