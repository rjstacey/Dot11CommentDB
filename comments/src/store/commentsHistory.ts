import { createSlice, isPlainObject, PayloadAction } from "@reduxjs/toolkit";

import { fetcher, setError } from "@common";

import type { RootState, AppThunk } from ".";
import {
	selectCommentsBallot_id,
	CommentResolutionChange,
	Comment,
	Resolution,
} from "./comments";

export type CommentHistoryEvent = {
	id: number;
	comment_id: number | null;
	resolution_id?: string;
	UserID: number | null;
	Action: "add" | "update" | "delete";
	Changes: CommentResolutionChange;
	Timestamp: string;
	UserName: string;
};

export type CommentHistoryEntry = Omit<CommentHistoryEvent, "resolution_id"> & {
	comment: Comment;
} & (
		| {
				resolution_id: string;
				resolution: Resolution;
		  }
		| {
				resolution_id: undefined;
				resolution: undefined;
		  }
	);

/* Create slice */
const initialState: {
	loading: boolean;
	valid: boolean;
	commentsHistory: CommentHistoryEntry[];
} = {
	loading: false,
	valid: false,
	commentsHistory: [],
};
const dataSet = "commentsHistory";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
			state.valid = false;
			state.commentsHistory = [];
		},
		getSuccess(
			state,
			action: PayloadAction<{ history: CommentHistoryEntry[] }>
		) {
			const { history } = action.payload;
			return {
				loading: false,
				valid: true,
				commentsHistory: history,
			};
		},
		getFailure(state) {
			state.loading = false;
		},
	},
});

export default slice;

/* Slice actions */
const { getPending, getSuccess, getFailure } = slice.actions;

/* Selectors */
export const selectCommentsHistoryState = (state: RootState) => state[dataSet];

/* Thunk actions */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isGenericObject(o: unknown): o is Record<string, any> {
	return isPlainObject(o);
}

function validResponse(
	response: unknown
): response is { history: CommentHistoryEntry[] } {
	return isGenericObject(response) && Array.isArray(response.history);
}

export const loadCommentsHistory =
	(comment_id: number): AppThunk =>
	async (dispatch, getState) => {
		const ballot_id = selectCommentsBallot_id(getState());
		dispatch(getPending());
		const url = `/api/commentHistory/${ballot_id}/${comment_id}`;
		let response: unknown;
		try {
			response = await fetcher.get(url);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(getFailure());
			dispatch(
				setError(
					`Unable to get comments history for ${comment_id}`,
					error
				)
			);
			return;
		}
		dispatch(getSuccess(response));
	};
