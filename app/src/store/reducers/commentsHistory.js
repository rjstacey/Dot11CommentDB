
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
			const resolution_ids = [...new Set(action.commentsHistory.map(h => h.resolution_id))];
			let commentsHistory = action.commentsHistory;
			console.log(resolution_ids)
			for (let resId of resolution_ids) {
				let changes = {};
				commentsHistory = commentsHistory.map(h => {
					if (h.resolution_id === null || h.resolution_id === resId) {
						changes = {...changes, ...h.Changes};
					}
					if (h.resolution_id &&
						resolution_ids.length > 2 &&
						changes.hasOwnProperty('CommentID') &&
						changes.hasOwnProperty('ResolutionID')) {
						changes.CID = `${changes.CommentID}.${changes.ResolutionID}`;
					}
					else { 
						changes.CID = changes.hasOwnProperty('CommentID')? changes.CommentID.toString(): 'Unknown';
					}
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
