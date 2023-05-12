import type { EntityId, PayloadAction } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	createAppTableDataSlice, SortType, getAppTableDataSelectors, isObject
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { VotingPool, upsertVotingPool, validVotingPool } from './votingPools';

export type Voter = {
	id: string;
	SAPIN: number;
	CurrentSAPIN: number;
	Name: string;
	Email: string;
	Affiliation: string;
	Status: string;
	Excused: boolean;
	VotingPoolID: string;
}

export type VoterCreate = {
	id?: Voter["id"];
	SAPIN: Voter["SAPIN"];
	Excused?: Voter["Excused"];
	Status: Voter["Status"];
}

export const dataSet = 'voters';

export const excusedOptions = [
	{value: 0, label: 'No'},
	{value: 1, label: 'Yes'}
];

const renderExcused = value => {
	const o = excusedOptions.find(o => o.value === value);
	return o? o.label: value;
}

export const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Email: {label: 'Email'},
	Name: {label: 'Name'},
	Status: {label: 'Status'},
	Excused: {label: 'Excused', options: excusedOptions, dataRenderer: renderExcused}
};

/*
 * Selectors
 */
export const selectVotersState = (state: RootState) => state[dataSet];
const selectVoterIds = (state: RootState) => selectVotersState(state).ids;
//const selectVoterEntities = (state: RootState) => selectVotersState(state).entities;
const selectVotersCount = (state: RootState) => selectVoterIds(state).length;

export const votersSelectors = getAppTableDataSelectors(selectVotersState);

const sortComparer = (v1: Voter, v2: Voter) => v1.SAPIN - v2.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState: {
		votingPoolId: '',
	},
	reducers: {
		setVotingPoolID(state, action: PayloadAction<string>) {
			state.votingPoolId = action.payload;
		},
	}
});

export default slice;


/*
 * Actions
 */
export const votersActions = slice.actions;

const {
	setVotingPoolID,
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	setMany,
} = slice.actions;

const baseUrl = '/api/voters';

function validVoter(voter: any): voter is Voter {
	return isObject(voter);
}

function validResponse(response: any): response is {voters: Voter[]; votingPool: VotingPool} {
	return isObject(response) &&
		Array.isArray(response.voters) && response.voters.every(validVoter) &&
		validVotingPool(response.votingPool);
}

export const loadVoters = (votingPoolId: string): AppThunk =>
	async (dispatch, getState) => {
		if (selectVotersState(getState()).loading)
			return;
		dispatch(getPending());
		dispatch(setVotingPoolID(votingPoolId));
		const url = `${baseUrl}/${votingPoolId}`;
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response))
				throw new TypeError("Unexpected response to GET " + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get voters for ${votingPoolId}`, error));
			return;
		}
		dispatch(getSuccess(response.voters));
	}

export const deleteVoters = (votingPoolId: string, ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		dispatch(removeMany(ids));
		const count = selectVotersCount(getState());
		dispatch(upsertVotingPool({VotingPoolID: votingPoolId, VoterCount: count}));
		const url = `${baseUrl}/${votingPoolId}`;
		try {
			await fetcher.delete(url, ids);
		}
		catch(error) {
			dispatch(setError(`Unable to delete voters in voting pool ${votingPoolId}`, error));
			return;
		}
	}

export const votersFromSpreadsheet = (votingPoolId: string, file): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		dispatch(setVotingPoolID(votingPoolId));
		const url = `${baseUrl}/${votingPoolId}/upload`;
		let response: any;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!validResponse(response))
				throw new TypeError(`Unexpected response to POST ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to upload voters for voting pool ${votingPoolId}`, error));
			return;
		}
		dispatch(upsertVotingPool(response.votingPool));
		dispatch(getSuccess(response.voters));
	}

export const votersFromMembersSnapshot = (votingPoolId: string, date: string): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		dispatch(setVotingPoolID(votingPoolId));
		const url = `${baseUrl}/${votingPoolId}/membersSnapshot`;
		let response: any;
		try {
			response = await fetcher.post(url, {date});
			if (!validResponse(response))
				throw new TypeError("`Unexpected response");
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to create voting pool ${votingPoolId}`, error));
			return;
		}
		dispatch(upsertVotingPool(response.votingPool));
		dispatch(getSuccess(response.voters));
	}

export const addVoter = (votingPoolId: string, voterIn: VoterCreate): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${votingPoolId}`;
		let response: any;
		try {
			response = await fetcher.post(url, [voterIn]);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			dispatch(setError('Unable to add voter', error));
			return;
		}
		dispatch(upsertVotingPool(response.votingPool));
		dispatch(setMany(response.voters));
	}

export const updateVoter = (id: string, changes: Partial<Voter>): AppThunk =>
	async (dispatch) => {
		let response: any;
		try {
			response = await fetcher.patch(baseUrl, [{id, changes}]);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			dispatch(setError('Unable to update voter', error));
			return;
		}
		dispatch(upsertVotingPool(response.votingPool));
		dispatch(setMany(response.voters));
	}

export const exportVoters = (votingPoolId: string): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${votingPoolId}/export`;
		try {
			await fetcher.getFile(url);
		}
		catch(error) {
			dispatch(setError('Unable to export voters', error));
		}
	}
