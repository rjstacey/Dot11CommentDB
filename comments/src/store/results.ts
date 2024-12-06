import { createAction, Action, createSelector } from "@reduxjs/toolkit";

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
	getBallotId,
	Ballot,
	BallotTypeLabels,
} from "./ballots";
import { selectGroupPermissions } from "./groups";
import { selectIsOnline } from "./offline";

export type Result = {
	id: string;
	ballot_id: number;
	SAPIN: number;
	Email: string;
	Name: string;
	Affiliation: string;
	Status: string;
	lastBallotId: number;
	lastSAPIN: number;
	vote: string;
	commentCount: number;
	totalCommentCount: number;
	notes: string;
};

export type ResultChange = Partial<Pick<Result, "vote" | "notes">>;

export type ResultUpdate = {
	id: string;
	changes: ResultChange;
};

function validResult(result: any): result is Result {
	return (
		isObject(result) &&
		typeof result.id === "string" &&
		typeof result.ballot_id === "number" &&
		(typeof result.SAPIN === "undefined" ||
			typeof result.SAPIN === "number")
	);
}

export const fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Affiliation: { label: "Affiliation" },
	Email: { label: "Email" },
	Status: { label: "Status" },
	vote: { label: "Vote" },
	lastSAPIN: { label: "SA PIN Used" },
	BallotName: { label: "Last Ballot" },
	commentCount: { label: "Comments", type: FieldType.NUMERIC },
	totalCommentCount: { label: "Total Comments", type: FieldType.NUMERIC },
	notes: { label: "Notes" },
};

/* Create slice */
const initialState: {
	ballot_id: number | null;
} = {
	ballot_id: null,
};
const dataSet = "results";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId: (entity: Result) => entity.id,
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

const { getSuccess, getFailure, setMany, upsertTableColumns } = slice.actions;

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

export type ResultExtended = Omit<Result, "lastSAPIN"> & {
	lastSAPIN: number | null;
	BallotName: string | null;
};

const selectResultExtendedEntities = createSelector(
	selectResultsEntities,
	selectResultsBallot_id,
	selectBallotEntities,
	(entities, ballot_id, ballotEntities) => {
		const newEntities: Record<string, ResultExtended> = {};
		Object.values(entities).forEach((entity) => {
			let BallotName: string | null = null;
			if (entity!.lastBallotId && entity!.lastBallotId !== ballot_id) {
				const ballot = ballotEntities[entity!.lastBallotId];
				BallotName = ballot
					? BallotTypeLabels[ballot.Type] + ballot.number
					: "??";
			}
			newEntities[entity!.id] = {
				...entity!,
				lastSAPIN:
					entity!.lastSAPIN === entity!.SAPIN
						? null
						: entity!.lastSAPIN,
				BallotName,
			};
		});
		return newEntities;
	}
);

export const selectResultsAccess = (state: RootState) => {
	const { ballot_id } = selectResultsState(state);
	const ballot = ballot_id ? selectBallot(state, ballot_id) : undefined;
	return (
		(ballot?.groupId &&
			selectGroupPermissions(state, ballot.groupId).results) ||
		AccessLevel.none
	);
};

export const resultsSelectors = getAppTableDataSelectors(selectResultsState, {
	selectEntities: selectResultExtendedEntities,
});

/* Thunk actions */

function validResponse(
	response: any
): response is { ballots: Ballot[]; results: Result[] } {
	return (
		isObject(response) &&
		Array.isArray(response.ballots) &&
		response.ballots.every(validBallot) &&
		Array.isArray(response.results) &&
		response.results.every(validResult)
	);
}

const baseUrl = "/api/results";

let loadingPromise: Promise<void>;
export const loadResults =
	(ballot_id: number): AppThunk<void> =>
	(dispatch, getState) => {
		const { loading, ballot_id: currentBallot_id } = selectResultsState(
			getState()
		);
		if (currentBallot_id === ballot_id) {
			if (loading) return loadingPromise;
		}
		if (!selectIsOnline(getState())) {
			if (ballot_id !== currentBallot_id) dispatch(clearResults());
			return Promise.resolve();
		}
		dispatch(getPending({ ballot_id }));
		const url = `${baseUrl}/${ballot_id}`;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				const { ballots, results } = response;
				dispatch(getSuccess(results));
				dispatch(updateBallotsLocal(ballots));
			})
			.catch((error: any) => {
				const ballot = selectBallotEntities(getState())[ballot_id];
				const ballotId = ballot
					? getBallotId(ballot)
					: `id=${ballot_id}`;
				dispatch(getFailure());
				dispatch(
					setError(
						`Unable to get results list for ${ballotId}`,
						error
					)
				);
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

export const updateResults =
	(ballot_id: number, updates: ResultUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		let response: any;
		try {
			response = await fetcher.patch(`${baseUrl}/${ballot_id}`, updates);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(setError("Unable to update results", error));
			return;
		}
		dispatch(setMany(response.results));
		dispatch(updateBallotsLocal(response.ballots));
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
		dispatch(updateBallotsLocal(response.ballots));
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
		dispatch(updateBallotsLocal(response.ballots));
		if (selectResultsBallot_id(getState()) === ballot_id)
			dispatch(getSuccess(response.results));
	};
