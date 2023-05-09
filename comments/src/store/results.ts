import type { PayloadAction } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	isObject,
	createAppTableDataSlice, SortType, getAppTableDataSelectors
} from 'dot11-components';

//import {selectMembersState} from './members';
import { updateBallotSuccess } from './ballots';
import type { RootState, AppThunk } from '.';

const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Affiliation: {label: 'Affiliation'},
	Email: {label: 'Email'},
	Vote: {label: 'Vote'},
	CommentCount: {label: 'Comments', sortType: SortType.NUMERIC},
	Notes: {label: 'Notes'}
};

export const dataSet = 'results';

/*
 * Selectors
 */
export const selectResultsState = (state: RootState) => state[dataSet];
export const selectResultsIds = (state: RootState) => selectResultsState(state).ids;
export const selectResultsEntities = (state: RootState) => selectResultsState(state).entities;
export const selectResultsBallotId = (state: RootState) => selectResultsState(state).ballot_id;

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
	ballot_id: number;
	votingPoolSize: number;
	resultsSummary: object;
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	//selectEntities,
	initialState: {
		ballot_id: 0,
		votingPoolSize: 0,
		resultsSummary: {},
	} as ExtraState,
	reducers: {
  		setDetails(state, action: PayloadAction<ExtraState>) {
  			const {ballot_id, resultsSummary, votingPoolSize} = action.payload;
			state.ballot_id = ballot_id;
			state.resultsSummary = resultsSummary;
			state.votingPoolSize = votingPoolSize;
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

export const loadResults = (ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `${baseUrl}/${ballot_id}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!isObject(response) ||
				!isObject(response.ballot) ||
				typeof response.VotingPoolSize !== 'number' ||
				!Array.isArray(response.results) ||
				!isObject(response.summary))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			const ballot = getState()['ballots'].entities[ballot_id];
			const ballotId = ballot? ballot.BallotID: `id=${ballot_id}`;
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get results list for ${ballotId}`, error))
			]);
			return;
		}
		dispatch(getSuccess(response.results));
		const details: ExtraState = {
			ballot_id: response.ballot.id,
			votingPoolSize: response.VotingPoolSize,
			resultsSummary: response.summary
		}
		dispatch(setDetails(details));
	}

export const clearResults = slice.actions.removeAll;

export const exportResultsForProject  = (project: string): AppThunk =>
	async (dispatch) => {
		try {
			await fetcher.getFile(`${baseUrl}/exportForProject`, {Project: project});
		}
		catch (error) {
			dispatch(setError(`Unable to export results for ${project}`, error));
		}
	}

export const exportResultsForBallot  = (ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		try {
			await fetcher.getFile(`${baseUrl}/${ballot_id}/export`);
		}
		catch (error) {
			const ballot = getState()['ballots'].entities[ballot_id];
			const ballotId = ballot? ballot.BallotID: `id=${ballot_id}`;
			dispatch(setError(`Unable to export results for ${ballotId}`, error));
		}
	}

export const deleteResults = (ballot_id: number): AppThunk =>
	async (dispatch) => {
		try {
			await fetcher.delete(`${baseUrl}/${ballot_id}`);
		}
		catch(error) {
			dispatch(setError("Unable to delete results", error));
			return;
		}
		dispatch(updateBallotSuccess(ballot_id, {Results: undefined}));
	}

export const importResults = (ballot_id: number, epollNum: number): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/importFromEpoll/${epollNum}`;
		let response;
		try {
			response = await fetcher.post(url);
			if (!isObject(response) || !isObject(response.ballot))
				throw new TypeError("Unexpected reponse to POST: " + url);
		}
		catch(error) {
			dispatch(setError("Unable to import results", error));
			return;
		}
		dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

export const uploadEpollResults = (ballot_id: number, file): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/uploadEpollResults`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {ResultsFile: file})
			if (!isObject(response) || !isObject(response.ballot))
				throw TypeError("Unexpected reponse to POST " + url);
		}
		catch(error) {
			dispatch(setError("Unable to upload results", error));
			return;
		}
		dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

export const uploadMyProjectResults = (ballot_id: number, file): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/uploadMyProjectResults`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {ResultsFile: file});
			if (!isObject(response) || !isObject(response.ballot))
				throw new TypeError("Unexpected reponse to POST " + url);
		}
		catch(error) {
			dispatch(setError("Unable to upload results", error));
			return;
		}
		dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}
	
