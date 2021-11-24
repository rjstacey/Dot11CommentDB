import {fetcher} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

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

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {
		ballot: {},
		votingPoolSize: 0,
		resultsSummary: {},
	},
	reducers: {
  		setDetails(state, action) {
  			const {ballot, summary, votingPoolSize} = action.payload;
			state.ballot = ballot;
			state.resultsSummary = summary;
			state.votingPoolSize = votingPoolSize;
		},
	},
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {getPending, getSuccess, getFailure, setDetails} = slice.actions;

export const loadResults = (ballot_id) =>
	async (dispatch) => {
		dispatch(getPending());
		const url = `/api/results/${ballot_id}`;
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
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get results list', error))
			]);
			return;
		}
		await dispatch(getSuccess(response.results));
		const payload = {
			ballot: response.ballot,
			votingPoolSize: response.VotingPoolSize,
			summary: response.summary
		}
		await dispatch(setDetails(payload));
	}

export const clearResults = slice.actions.removeAll;

export const exportResultsForProject  = (project) =>
	async (dispatch) => {
		try {
			await fetcher.getFile('/api/results/exportForProject', {Project: project});
		}
		catch (error) {
			dispatch(setError(`Unable to export results for ${project}`, error));
		}
	}

export const exportResultsForBallot  = (ballot_id) =>
	async (dispatch, getState) => {
		try {
			await fetcher.getFile('/api/results/${ballot_id}/export');
		}
		catch (error) {
			const ballot = getState()[dataSet].entities[ballot_id];
			dispatch(setError(`Unable to export results for ${ballot.BallotID}`, error));
		}
	}

export const getResultsDataSet = (state) => state[dataSet];
