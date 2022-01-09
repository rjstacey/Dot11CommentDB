import {createSlice} from '@reduxjs/toolkit';

import {fetcher} from 'dot11-components/lib';
import {setError} from 'dot11-components/store/error';

const defaultState = {
	loading: false,
	valid: false,
	commentsHistory: []
};

export const dataSet = 'commentsHistory';

const slice = createSlice({
	name: dataSet,
	initialState: {
		loading: false,
		valid: false,
		commentsHistory: []
	},
	reducers: {
		getPending(state, action) {
			state.loading = true;
			state.valid = false;
			state.commentsHistory = [];
		},
  		getSuccess(state, action) {
  			let {commentsHistory, comments} = action.payload;
  			const comment = comments[0];
			const resolution_ids = [...new Set(commentsHistory.map(h => h.resolution_id))];
			for (const resId of resolution_ids) {
				let changes = {...comment, ResolutionID: null};
				let resolutionCount = 0;
				commentsHistory = commentsHistory.map(h => {
					if (h.Action === 'add' && h.resolution_id)
						resolutionCount++;
					if (h.Action === 'delete' && h.resolution_id)
						resolutionCount--;
					if (h.resolution_id === null || h.resolution_id === resId)
						changes = {...changes, ...h.Changes};
					
					if (h.resolution_id &&
						resolutionCount > 1 &&
						changes.hasOwnProperty('CommentID') &&
						changes.hasOwnProperty('ResolutionID')) {
						changes.CID = `${changes.CommentID}.${changes.ResolutionID}`;
					}
					else { 
						changes.CID = changes.hasOwnProperty('CommentID')? changes.CommentID.toString(): 'Unknown';
					}
					changes.ResolutionCount = resolutionCount;
					return (h.resolution_id === resId)? {...h, Changes: changes}: h;
				})
			}
			state.loading = false;
			state.valid = true;
			state.commentsHistory = commentsHistory;
		},
		getFailure(state, action) {
			state.loading = false;
		},
	}
});

/*
 * Reducer
 */
export default slice.reducer;

/*
 * Selectors
 */
export const selectCommentsHistoryState = (state) => state[dataSet];

/*
 * Actions
 */
const {getPending, getSuccess, getFailure} = slice.actions;

export const loadCommentsHistory = (comment_id) =>
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `/api/commentHistory/${comment_id}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments) ||
				!response.hasOwnProperty('commentsHistory') || !Array.isArray(response.commentsHistory))
				throw new TypeError('Unexpected response to GET: ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get comments history for ${comment_id}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}
