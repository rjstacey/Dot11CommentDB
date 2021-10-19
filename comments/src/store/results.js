import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData'
import {setError} from 'dot11-components/store/error'

import {updateBallotSuccess} from './ballots'

const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Affiliation: {label: 'Affiliation'},
	Email: {label: 'Email'},
	Vote: {label: 'Vote'},
	CommentCount: {label: 'Comments', sortType: SortType.NUMERIC},
	Notes: {label: 'Notes'}
};

const dataSet = 'results';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {
		ballotId: '',
		ballot: {},
		votingPoolSize: 0,
		resultsSummary: {},
	},
	reducers: {
  		setDetails(state, action) {
  			const {ballotId, ballot, summary, votingPoolSize} = action.payload;
			state.ballotId = ballotId;
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

export const loadResults = (ballotId) =>
	async (dispatch) => {
		dispatch(getPending());
		const url = `/api/results/${ballotId}`;
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
		const payload = {
			ballotId: response.BallotID,
			ballot: response.ballot,
			votingPoolSize: response.VotingPoolSize,
			summary: response.summary
		}
		await dispatch(getSuccess(response.results));
		await dispatch(setDetails(payload));
	}

