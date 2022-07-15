//import {createSelector} from '@reduxjs/toolkit';
import {fetcher} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

//import {selectMembersState} from './members';
import {updateBallotSuccess} from './ballots';

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
export const selectResultsState = (state) => state[dataSet];

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

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	//selectEntities,
	initialState: {
		ballot_id: 0,
		votingPoolSize: 0,
		resultsSummary: {},
	},
	reducers: {
  		setDetails(state, action) {
  			const {ballot_id, summary, votingPoolSize} = action.payload;
			state.ballot_id = ballot_id;
			state.resultsSummary = summary;
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


/*
 * Reducer
 */
export default slice.reducer;

/*
 * Actions
 */
const {getPending, getSuccess, getFailure, setDetails} = slice.actions;

const baseUrl = '/api/results';

export const loadResults = (ballot_id) =>
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `${baseUrl}/${ballot_id}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!response.hasOwnProperty('ballot') ||
				!response.hasOwnProperty('VotingPoolSize') ||
				!response.hasOwnProperty('results') ||
				!response.hasOwnProperty('summary'))
				throw new TypeError('Unexpected response to GET: ' + url);
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
		await dispatch(getSuccess(response.results));
		const details = {
			ballot_id: response.ballot.id,
			votingPoolSize: response.VotingPoolSize,
			summary: response.summary
		}
		await dispatch(setDetails(details));
	}

export const clearResults = slice.actions.removeAll;

export const exportResultsForProject  = (project) =>
	async (dispatch) => {
		try {
			await fetcher.getFile(`${baseUrl}/exportForProject`, {Project: project});
		}
		catch (error) {
			dispatch(setError(`Unable to export results for ${project}`, error));
		}
	}

export const exportResultsForBallot  = (ballot_id) =>
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

export const deleteResults = (ballot_id) =>
	async (dispatch) => {
		try {
			await fetcher.delete(`${baseUrl}/${ballot_id}`);
		}
		catch(error) {
			await dispatch(setError("Unable to delete results", error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, {Results: {}}));
	}

export const importResults = (ballot_id, epollNum) =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/importFromEpoll/${epollNum}`;
		let response;
		try {
			response = await fetcher.post(url);
			if (typeof response !== 'object' || typeof response.ballot !== 'object')
				throw new TypeError("Unexpected reponse to POST: " + url);
		}
		catch(error) {
			await dispatch(setError("Unable to import results", error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

export const uploadEpollResults = (ballot_id, file) =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/uploadEpollResults`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {ResultsFile: file})
			if (typeof response !== 'object' || typeof response.ballot !== 'object')
				throw TypeError("Unexpected reponse to POST: " + url);
		}
		catch(error) {
			await dispatch(setError("Unable to upload results", error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

export const uploadMyProjectResults = (ballot_id, file) =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/uploadMyProjectResults`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {ResultsFile: file});
			if (typeof response !== 'object' || typeof response.ballot !== 'object')
				throw new TypeError("Unexpected reponse to POST: " + url);
		}
		catch(error) {
			await dispatch(setError("Unable to upload results", error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}
	
