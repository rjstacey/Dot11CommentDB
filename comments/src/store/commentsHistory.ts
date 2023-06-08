import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { fetcher, isObject, setError } from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { CommentResolution, selectCommentsBallot_id } from './comments';

type CommentHistory = {
	id: number;
	comment_id: number | null;
	resolution_id: string | null;
	UserID: number | null;
	Action: "add" | "update" | "delete";
	Changes: object;
	Timestamp: string;
	UserName: string;
}

export const dataSet = 'commentsHistory';

const initialState: {
	loading: boolean;
	valid: boolean;
	commentsHistory: CommentHistory[];
} = {
	loading: false,
	valid: false,
	commentsHistory: []
}

const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
			state.valid = false;
			state.commentsHistory = [];
		},
  		getSuccess(state, action: PayloadAction<{comments: CommentResolution[]; commentsHistory: CommentHistory[]}>) {
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
		getFailure(state) {
			state.loading = false;
		},
	}
});

export default slice;

/*
 * Selectors
 */
export const selectCommentsHistoryState = (state: RootState) => state[dataSet];

/*
 * Actions
 */
const {getPending, getSuccess, getFailure} = slice.actions;

function validResponse(response: any): response is {comments: CommentResolution[]; commentsHistory: CommentHistory[]} {
	return isObject(response) &&
		Array.isArray(response.comments) &&
		Array.isArray(response.commentsHistory);
}

export const loadCommentsHistory = (comment_id: number): AppThunk =>
	async (dispatch, getState) => {
		const ballot_id = selectCommentsBallot_id(getState());
		dispatch(getPending());
		const url = `/api/commentHistory/${ballot_id}/${comment_id}`;
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response))
				throw new TypeError('Unexpected response');
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get comments history for ${comment_id}`, error));
			return;
		}
		dispatch(getSuccess(response));
	}
