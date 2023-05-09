import { createSelector } from '@reduxjs/toolkit';
import type { EntityId, Dictionary } from '@reduxjs/toolkit';
import { v4 as uuid } from 'uuid';
import {
	fetcher,
	setError,
	createAppTableDataSlice, SortType, getAppTableDataSelectors
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { upsertVotingPool } from './votingPools';
import { selectMemberEntities } from './members';

export type Voter = {
	id: string;
	SAPIN: number;
	CurrentSAPIN: number;
	//Name: string;
	//Email: string;
	//Affiliation: string;
	Status: string;
	Excused: boolean;
	VotingPoolID: string;
}

export type SyncedVoter = Voter & {
	Name: string;
	Email?: string;
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
const selectVoterEntities = (state: RootState) => selectVotersState(state).entities;
const selectVotersCount = (state: RootState) => state[dataSet].ids.length;

/* Entities selector with join on members to get Name, Affiliation and Email.
 * If the member entry is obsolete find the member entry that replaces it. */
const selectEntities = createSelector(
	selectMemberEntities,
	selectVoterEntities,
	(members, voters) => {
		const entities: Dictionary<SyncedVoter> = {};
		for (const [id, voter] of Object.entries(voters)) {
			let member = members[voter!.SAPIN];
			/*while (member && member.Status === 'Obsolete') {
				member = members[member.ReplacedBySAPIN]
			}*/
			entities[id] = {
				...voter!,
				Name: (member && member.Name) || '',
				//Affiliation: (member && member.Affiliation) || '',
				Email: (member && member.Email)
			};
		}
		return entities;
	}
);

export const votersSelectors = getAppTableDataSelectors(selectVotersState, {selectEntities: selectEntities});

const sortComparer = (v1: Voter, v2: Voter) => v1.SAPIN - v2.SAPIN;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState: {
		votingPoolId: '',
	},
	reducers: {
		setVotingPoolID(state, action) {
			state.votingPoolId = action.payload;
		},
	},
	/*extraReducers: (builder) => {
		builder
		.addMatcher(
			(action) => ['votingPools/upsertVotingPool', 'votingPools/updateVotingPool'].includes(action.type),
			(state, action) => {
				const votingPool = action.payload;
				if (state.votingPool.VotingPoolID === votingPool.VotingPoolID) {
					state.votingPool = {...state.votingPool, ...votingPool};
				}
			}
		);
	}*/
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
	addOne,
	updateOne
} = slice.actions;

const baseUrl = '/api/voters';

export const loadVoters = (votingPoolId: string): AppThunk =>
	async (dispatch, getState) => {
		if (selectVotersState(getState()).loading)
			return;
		dispatch(getPending());
		dispatch(setVotingPoolID(votingPoolId));
		const url = `${baseUrl}/${votingPoolId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get voters for ${votingPoolId}`, error))
			]);
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
		let response;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to upload voters for voting pool ${votingPoolId}`, error));
			return;
		}
		dispatch(upsertVotingPool(response.votingPool));
		dispatch(getSuccess(response.voters));
	}

export const votersFromMembersSnapshot = (votingPoolId: string, date): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		dispatch(setVotingPoolID(votingPoolId));
		const url = `${baseUrl}/${votingPoolId}/membersSnapshot`;
		let response;
		try {
			response = await fetcher.post(url, {date});
			if (typeof response !== 'object' ||
				!response.hasOwnProperty('votingPool') ||
				!response.hasOwnProperty('voters'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
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
	async (dispatch, getState) => {
		const voter: Voter = {
			id: uuid(),
			Excused: false,
			...voterIn,
			CurrentSAPIN: voterIn.SAPIN,
			VotingPoolID: votingPoolId
		};
		dispatch(addOne(voter));
		const count = selectVotersCount(getState());
		dispatch(upsertVotingPool({VotingPoolID: votingPoolId, VoterCount: count}));

		const url = `${baseUrl}/${votingPoolId}`;
		try {
			await fetcher.post(url, [voterIn]);
		}
		catch(error) {
			dispatch(setError('Unable to add voter', error));
			return;
		}
	}

export const updateVoter = (id: string, changes: Partial<Voter>): AppThunk =>
	async (dispatch) => {
		dispatch(updateOne({id, changes}));
		try {
			await fetcher.patch(baseUrl, [{id, changes}]);
		}
		catch(error) {
			dispatch(setError('Unable to update voter', error));
			return;
		}
	}

export const exportVoters = (votingPoolId: string): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${votingPoolId}/export`;
		try {
			await fetcher.getFile(url);
		}
		catch(error) {
			dispatch(setError('Unable to export voters', error));
			return;
		}
	}
