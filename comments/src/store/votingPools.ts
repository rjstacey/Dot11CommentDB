import { createSelector } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	createAppTableDataSlice, SortType, getAppTableDataSelectors, isObject
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

const baseUrl = '/api/votingPools';

export function validVotingPool(votingPool: any): votingPool is VotingPool {
	return isObject(votingPool) &&
		typeof votingPool.VotingPoolID === 'string' &&
		typeof votingPool.VoterCount === 'number';
}

function validGetResponse(response: any): response is {votingPools: VotingPool[]} {
	return isObject(response) &&
		Array.isArray(response.votingPools) &&
		response.votingPools.every(validVotingPool);
}

function validResponse(response: any): response is {votingPool: VotingPool} {
	return isObject(response) && validVotingPool(response.votingPool);
}

export const loadVotingPools = (): AppThunk<VotingPool[]> =>
	async (dispatch) => {
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.get(baseUrl);
			if (!validGetResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get voting pool list', error));
			return [];
		}
		dispatch(getSuccess(response.votingPools));
		return response.votingPools;
	}

export const getVotingPools = (): AppThunk<VotingPool[]> =>
	async (dispatch, getState) => {
		const {loading, ids, entities}  = selectVotingPoolsState(getState());
		if (loading)
			return ids.map(id => entities[id]!);
		return dispatch(loadVotingPools());
	}

export const deleteVotingPools = (ids: string[]): AppThunk =>
	async (dispatch) => {
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			dispatch(setError('Unable to delete voting pool(s)', error));
			return;
		}
		dispatch(removeMany(ids));
	}

export const updateVotingPool = (votingPoolId: string, changes: Partial<VotingPool>): AppThunk<VotingPool | undefined> =>
	async (dispatch) => {
		const url = `${baseUrl}/${votingPoolId}`;
		let response: any;
		try {
			response = await fetcher.patch(url, changes);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			dispatch(setError('Unable to update voting pool', error));
			return;
		}
		dispatch(updateOne({id: votingPoolId, changes: response.votingPool}));
		return response.votingPool;
	}

export {upsertOne as upsertVotingPool};

