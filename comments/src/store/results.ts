import type { PayloadAction } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	isObject,
	createAppTableDataSlice, SortType, getAppTableDataSelectors,
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { AccessLevel } from './user';
import { updateBallotsLocal, selectBallotEntities, selectBallot, validBallot, Ballot } from './ballots';
import { selectGroupPermissions } from './groups';

export type Result = {
    id: string;
    ballot_id: number;
    SAPIN: number;
	CurrentSAPIN: number;
    Email?: string;
    Name: string;
    Affiliation: string;
	Status: string;
    Vote: string;
    CommentCount: number;
	Notes: string;
}

const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Affiliation: {label: 'Affiliation'},
	Email: {label: 'Email'},
	Vote: {label: 'Vote'},
	CommentCount: {label: 'Comments', sortType: SortType.NUMERIC},
	Notes: {label: 'Notes'}
};

/*
 * Selectors
 */
export const selectResultsState = (state: RootState) => state[dataSet];
export const selectResultsIds = (state: RootState) => selectResultsState(state).ids;
export const selectResultsEntities = (state: RootState) => selectResultsState(state).entities;
export const selectResultsBallot_id = (state: RootState) => selectResultsState(state).ballot_id;

export const selectResultsAccess = (state: RootState) => {
	const {ballot_id} = selectResultsState(state);
	const ballot = ballot_id? selectBallot(state, ballot_id): undefined;
	return (ballot?.groupId && selectGroupPermissions(state, ballot.groupId).results) || AccessLevel.none;
}

/* Entities selector with join on users to get Name, Affiliation and Email.
 * If the entry is obsolete find the member entry that replaces it. */
/*const selectEntities = createSelector(
	state => selectMembersState(state).entities,
	state => selectResultsState(state).entities,
	(members, results) => {
		const entities = {};
		for (const [id, voter] of Object.entries(results)) {
			const member = members[voter.SAPIN];
			//while (member && member.Status === 'Obsolete') {
			//	member = members[member.ReplacedBySAPIN]
			//}
			entities[id] = {
				...voter,
				Name: (member && member.Name) || '',
				Affiliation: (member && member.Affiliation) || '',
				Email: (member && member.Email) || ''
			};
		}
		return entities;
	}
);*/

export const resultsSelectors = getAppTableDataSelectors(selectResultsState);

type ExtraState = {
	ballot_id: number | null;
}

const initialState: ExtraState = {ballot_id: null};
const dataSet = 'results';
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	reducers: {
  		setDetails(state, action: PayloadAction<ExtraState>) {
			state.ballot_id = action.payload.ballot_id;
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder
		.addMatcher(
			(action) => action.type === 'ballots/setCurrentId',
			(state, action) => {
				const id = action.payload;
				if (state.ballot_id !== id) {
					state.valid = false;
					dataAdapter.removeAll(state);
				}
			}
		)
	}
});

export default slice;

/*
 * Actions
 */

export const resultsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	setDetails,
	upsertTableColumns
} = slice.actions;

export {upsertTableColumns};

const baseUrl = '/api/results';

function validResult(result: any): result is Result {
	return isObject(result) &&
		typeof result.id === 'string' &&
		typeof result.ballot_id === 'number';
}

function validResponse(response: any): response is {ballot: Ballot; results: Result[]} {
	return isObject(response) &&
		validBallot(response.ballot) &&
		Array.isArray(response.results) && response.results.every(validResult);
}

export const loadResults = (ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `${baseUrl}/${ballot_id}`;
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch(error) {
			const ballot = selectBallotEntities(getState())[ballot_id];
			const ballotId = ballot? ballot.BallotID: `id=${ballot_id}`;
			dispatch(getFailure());
			dispatch(setError(`Unable to get results list for ${ballotId}`, error));
			return;
		}
		dispatch(getSuccess(response.results));
		dispatch(setDetails({ballot_id: response.ballot.id}));
	}

export const clearResults = slice.actions.removeAll;

export const exportResults  = (ballot_id: number, forSeries?: boolean): AppThunk =>
	async (dispatch) => {
		try {
			await fetcher.getFile(`${baseUrl}/${ballot_id}/export`, {forSeries});
		}
		catch (error) {
			dispatch(setError("Unable to export results", error));
		}
	}

export const deleteResults = (ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete(`${baseUrl}/${ballot_id}`);
		}
		catch(error) {
			dispatch(setError("Unable to delete results", error));
			return;
		}
		dispatch(updateBallotsLocal([{id: ballot_id, Results: undefined}]));
		if (selectResultsBallot_id(getState()) === ballot_id)
			dispatch(clearResults());
	}

export const importResults = (ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${ballot_id}/import`;
		let response: any;
		try {
			response = await fetcher.post(url);
			if (!validResponse(response))
				throw new TypeError("Unexpected reponse");
		}
		catch(error) {
			dispatch(setError("Unable to import results", error));
			return;
		}
		dispatch(updateBallotsLocal([response.ballot]));
		if (selectResultsBallot_id(getState()) === ballot_id)
			dispatch(getSuccess(response.results));
	}

export const uploadResults = (ballot_id: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${ballot_id}/upload`;
		let response: any;
		try {
			response = await fetcher.postMultipart(url, {ResultsFile: file})
			if (!validResponse(response))
				throw TypeError("Unexpected reponse");
		}
		catch(error) {
			dispatch(setError("Unable to upload results", error));
			return;
		}
		dispatch(updateBallotsLocal([response.ballot]));
		if (selectResultsBallot_id(getState()) === ballot_id)
			dispatch(getSuccess(response.results));
	}
