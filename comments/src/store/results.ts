import { createAction, Action } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	isObject,
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { AccessLevel } from "./user";
import {
	updateBallotsLocal,
	selectBallotEntities,
	selectBallot,
	validBallot,
	Ballot,
} from "./ballots";
import { selectGroupPermissions } from "./groups";

export type Result = {
	id: string;
	ballot_id: number;
	SAPIN: number;
	CurrentSAPIN: number;
	Email?: string;
	Name: string;
	Affiliation: string;
	Status: string;
	Vote: string;
	CommentCount: number;
	Notes: string;
};

function validResult(result: any): result is Result {
	return (
		isObject(result) &&
		typeof result.id === "string" &&
		typeof result.ballot_id === "number"
	);
}

const fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Affiliation: { label: "Affiliation" },
	Email: { label: "Email" },
	Vote: { label: "Vote" },
	CommentCount: { label: "Comments", type: FieldType.NUMERIC },
	Notes: { label: "Notes" },
};

/* Create slice */
const initialState: {
	ballot_id: number | null;
} = {
	ballot_id: null
};
const dataSet = "results";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { ballot_id } = action.payload;
					if (ballot_id !== state.ballot_id) {
						state.ballot_id = ballot_id;
						state.valid = false;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearResults.toString(),
				(state) => {
					state.ballot_id = null;
					state.valid = false;
					dataAdapter.removeAll(state);
				}
			);
	},
});

export default slice;

/* Slice actions */
export const resultsActions = slice.actions;

const { getSuccess, getFailure, upsertTableColumns } = slice.actions;

// Overload getPending() with one that sets groupName
const getPending = createAction<{ ballot_id: number | null }>(
	dataSet + "/getPending"
);
export const clearResults = createAction(dataSet + "/clear");

export { upsertTableColumns };

/* Selectors */
export const selectResultsState = (state: RootState) => state[dataSet];
export const selectResultsIds = (state: RootState) =>
	selectResultsState(state).ids;
export const selectResultsEntities = (state: RootState) =>
	selectResultsState(state).entities;
export const selectResultsBallot_id = (state: RootState) =>
	selectResultsState(state).ballot_id;

export const selectResultsAccess = (state: RootState) => {
	const { ballot_id } = selectResultsState(state);
	const ballot = ballot_id ? selectBallot(state, ballot_id) : undefined;
	return (
		(ballot?.groupId &&
			selectGroupPermissions(state, ballot.groupId).results) ||
		AccessLevel.none
	);
};

export const resultsSelectors = getAppTableDataSelectors(selectResultsState);

/* Thunk actions */

function validResponse(
	response: any
): response is { ballot: Ballot; results: Result[] } {
	return (
		isObject(response) &&
		validBallot(response.ballot) &&
		Array.isArray(response.results) &&
		response.results.every(validResult)
	);
}

const baseUrl = "/api/results";

let loadingPromise: Promise<Result[]>;
export const loadResults =
	(ballot_id: number): AppThunk<Result[]> =>
	(dispatch, getState) => {
		const { loading, ballot_id: currentBallot_id } = selectResultsState(
			getState()
		);
		if (loading && currentBallot_id === ballot_id) {
			return loadingPromise;
		}
		dispatch(getPending({ ballot_id }));
		const url = `${baseUrl}/${ballot_id}`;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess(response.results));
				return response.results;
			})
			.catch((error: any) => {
				const ballot = selectBallotEntities(getState())[ballot_id];
				const ballotId = ballot ? ballot.BallotID : `id=${ballot_id}`;
				dispatch(getFailure());
				dispatch(
					setError(
						`Unable to get results list for ${ballotId}`,
						error
					)
				);
				return [];
			});
		return loadingPromise;
	};

export const exportResults =
	(ballot_id: number, forSeries?: boolean): AppThunk =>
	async (dispatch) => {
		try {
			await fetcher.getFile(`${baseUrl}/${ballot_id}/export`, {
				forSeries,
			});
		} catch (error) {
			dispatch(setError("Unable to export results", error));
		}
	};

export const deleteResults =
	(ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		try {
			await fetcher.delete(`${baseUrl}/${ballot_id}`);
		} catch (error) {
			dispatch(setError("Unable to delete results", error));
			return;
		}
		dispatch(updateBallotsLocal([{ id: ballot_id, Results: undefined }]));
		if (selectResultsBallot_id(getState()) === ballot_id)
			dispatch(clearResults());
	};

export const importResults =
	(ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${ballot_id}/import`;
		let response: any;
		try {
			response = await fetcher.post(url);
			if (!validResponse(response))
				throw new TypeError("Unexpected reponse");
		} catch (error) {
			dispatch(setError("Unable to import results", error));
			return;
		}
		dispatch(updateBallotsLocal([response.ballot]));
		if (selectResultsBallot_id(getState()) === ballot_id)
			dispatch(getSuccess(response.results));
	};

export const uploadResults =
	(ballot_id: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${ballot_id}/upload`;
		let response: any;
		try {
			response = await fetcher.postMultipart(url, { ResultsFile: file });
			if (!validResponse(response)) throw TypeError("Unexpected reponse");
		} catch (error) {
			dispatch(setError("Unable to upload results", error));
			return;
		}
		dispatch(updateBallotsLocal([response.ballot]));
		if (selectResultsBallot_id(getState()) === ballot_id)
			dispatch(getSuccess(response.results));
	};
