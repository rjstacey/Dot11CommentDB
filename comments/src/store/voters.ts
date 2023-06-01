import type { EntityId, PayloadAction } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	createAppTableDataSlice, SortType, getAppTableDataSelectors, isObject
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { updateBallotsLocal } from './ballots';

export type Voter = {
	id: string;
	ballot_id: number;
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
	ballot_id: Voter["ballot_id"];
	SAPIN: Voter["SAPIN"];
	Excused?: Voter["Excused"];
	Status: Voter["Status"];
}

export const voterExcusedOptions = [
	{value: false, label: 'No'},
	{value: true, label: 'Yes'}
];

const voterStatus = ["Voter", "ExOfficio"] as const;

export const voterStatusOptions = voterStatus.map(s => ({value: s, label: s}));

export const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Email: {label: 'Email'},
	Name: {label: 'Name'},
	Status: {label: 'Status', options: voterStatusOptions},
	Excused: {label: 'Excused', options: voterExcusedOptions}
};

/*
 * Selectors
 */
export const selectVotersState = (state: RootState) => state[dataSet];
export const selectVotersBallotId = (state: RootState) => selectVotersState(state).ballot_id;

export const votersSelectors = getAppTableDataSelectors(selectVotersState);

const sortComparer = (v1: Voter, v2: Voter) => v1.SAPIN - v2.SAPIN;

type ExtraState = {
	ballot_id: number;
};

const initialState: ExtraState = {
	ballot_id: 0
};

export const dataSet = 'voters';
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState,
	reducers: {
		setDetails(state, action: PayloadAction<Partial<ExtraState>>) {
			const changes = action.payload;
			return {...state, ...changes};
		}
	}
});

export default slice;


/*
 * Actions
 */
export const votersActions = slice.actions;

const {
	setDetails,
	getPending,
	getSuccess,
	getFailure,
	removeMany,
	removeAll,
	setMany,
} = slice.actions;

const baseUrl = '/api/voters';

type VoterBallotUpdate = {
	id: number;
	Voters: number;
}

function validBallotsUpdate(ballots: any) {
	return Array.isArray(ballots) && ballots.every(b => typeof b.id === 'number' && typeof b.Voters === 'number');
}

function validVoter(voter: any): voter is Voter {
	return isObject(voter);
}

function validResponse(response: any): response is {voters: Voter[], ballots?: VoterBallotUpdate[]} {
	return isObject(response) &&
		Array.isArray(response.voters) && response.voters.every(validVoter) &&
		(typeof response.ballots === 'undefined' || validBallotsUpdate(response.ballots));
}

function validGetResponse(response: any): response is Voter[] {
	return Array.isArray(response) && response.every(validVoter);
}

export const loadVoters = (ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		if (selectVotersState(getState()).loading)
			return;
		dispatch(getPending());
		const url = `${baseUrl}/${ballot_id}`;
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validGetResponse(response))
				throw new TypeError("Unexpected response to GET " + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get voters`, error));
			return;
		}
		dispatch(getSuccess(response));
		dispatch(setDetails({ballot_id}));
	}

export const clearVoters = (): AppThunk =>
	async (dispatch) => {
		dispatch(removeAll());
		dispatch(setDetails({ballot_id: 0}));
	}

export const deleteVoters = (ids: EntityId[]): AppThunk =>
	async (dispatch) => {
		dispatch(removeMany(ids));
		try {
			await fetcher.delete(baseUrl, ids);
		}
		catch(error) {
			dispatch(setError(`Unable to delete voters`, error));
		}
	}

export const votersFromSpreadsheet = (ballot_id: number, file: File): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		const url = `${baseUrl}/${ballot_id}/upload`;
		let response: any;
		try {
			response = await fetcher.postMultipart(url, {File: file});
			if (!validResponse(response))
				throw new TypeError(`Unexpected response`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to upload voters`, error));
			return;
		}
		dispatch(getSuccess(response.voters));
		if (response.ballots)
			dispatch(updateBallotsLocal(response.ballots));
	}

export const votersFromMembersSnapshot = (ballot_id: number, date: string): AppThunk =>
	async (dispatch) => {
		dispatch(getPending());
		const url = `${baseUrl}/${ballot_id}/membersSnapshot`;
		let response: any;
		try {
			response = await fetcher.post(url, {date});
			if (!validResponse(response))
				throw new TypeError("`Unexpected response");
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to create voting pool`, error));
			return;
		}
		dispatch(getSuccess(response.voters));
		if (response.ballots)
			dispatch(updateBallotsLocal(response.ballots));
	}

export const addVoter = (ballot_id: number, voterIn: VoterCreate): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}`;
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
		dispatch(setMany(response.voters));
		if (response.ballots)
			dispatch(updateBallotsLocal(response.ballots));
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
		dispatch(setMany(response.voters));
	}

export const exportVoters = (ballot_id: number): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/export`;
		try {
			await fetcher.getFile(url);
		}
		catch(error) {
			dispatch(setError('Unable to export voters', error));
		}
	}
