import {createSlice} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './fetcher'

const defaultState = {
	loading: false,
	valid: false,
	commentsHistory: []
};

const dataSet = 'commentsHistory';

const commentsHistorySlice = createSlice({
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

const {getPending, getSuccess, getFailure} = commentsHistorySlice.actions;

export function loadCommentsHistory(comment) {
	return async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(`/api/commentsHistory/${comment.comment_id}`)
		}
		catch(error) {
			return Promise.all([
				dispatch(getCommentsHistoryFailure()),
				dispatch(setError(`Unable to get comments history for ${comment.CID}`, error))
			]);
		}
		return dispatch(getSuccess(response))
	}
}

export default commentsHistorySlice.reducer;
