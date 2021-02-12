
import {
	COMMENTS_HISTORY_GET,
	COMMENTS_HISTORY_GET_SUCCESS,
	COMMENTS_HISTORY_GET_FAILURE,
} from '../actions/commentsHistory'

const defaultState = {
	loading: false,
	valid: false,
	commentsHistory: []
};

function commentsHistoryReducer(state = defaultState, action) {

	switch (action.type) {

		case COMMENTS_HISTORY_GET:
			return {
				...state,
				loading: true,
				valid: false,
				commentsHistory: []
			}
		case COMMENTS_HISTORY_GET_SUCCESS:
			const comment = action.comments[0];
			const resolution_ids = [...new Set(action.commentsHistory.map(h => h.resolution_id))];
			let commentsHistory = action.commentsHistory;
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
			return {
				...state,
				loading: false,
				valid: true,
				commentsHistory
			}
		case COMMENTS_HISTORY_GET_FAILURE:
			return {...state, loading: false}

		default:
			return state
	}
}

export default commentsHistoryReducer;
