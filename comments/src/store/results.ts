import { createAction, Action, createSelector } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { AccessLevel } from "./user";
import {
	updateBallotsLocal,
	selectBallotEntities,
	selectBallot,
	BallotTypeLabels,
} from "./ballots";
import { selectGroupPermissions } from "./groups";
import { selectIsOnline } from "./offline";
import {
	Result,
	ResultUpdate,
	ResultChange,
	getResultsResponseSchema,
} from "@schemas/results";

export type { Result, ResultUpdate, ResultChange };

export const fields: Fields = {
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
const initialState = {
	ballot_id: null as number | null,
	lastLoad: null as string | null,
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
					state.lastLoad = new Date().toISOString();
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
const selectResultsAge = (state: RootState) => {
	let lastLoad = selectResultsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
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
			const lastSAPIN =
				(entity!.lastSAPIN === entity!.SAPIN
					? null
					: entity!.lastSAPIN) || null;
			newEntities[entity!.id] = {
				...entity!,
				lastSAPIN,
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
const baseUrl = "/api/results";

const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadResults =
	(ballot_id: number, force = false): AppThunk =>
	(dispatch, getState) => {
		const state = getState();
		const currentBallot_id = selectResultsState(state).ballot_id;
		if (currentBallot_id === ballot_id) {
			if (loading) return loadingPromise;
			const age = selectResultsAge(state);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ ballot_id }));
		const url = `${baseUrl}/${ballot_id}`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				const { ballots, results } =
					getResultsResponseSchema.parse(response);
				dispatch(getSuccess(results));
				dispatch(updateBallotsLocal(ballots));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const refreshResults = (): AppThunk => async (dispatch, getState) => {
	const { ballot_id } = selectResultsState(getState());
	dispatch(ballot_id ? loadResults(ballot_id, true) : clearResults());
};

export const exportResults =
	(ballot_id: number, forSeries?: boolean): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/export`;
		try {
			await fetcher.getFile(url, {
				forSeries,
			});
		} catch (error) {
			dispatch(setError("GET " + url, error));
		}
	};

export const updateResults =
	(ballot_id: number, updates: ResultUpdate[]): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}`;
		try {
			const response = await fetcher.patch(url, updates);
			const { ballots, results } =
				getResultsResponseSchema.parse(response);
			dispatch(setMany(results));
			dispatch(updateBallotsLocal(ballots));
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
		}
	};

export const deleteResults =
	(ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${ballot_id}`;
		try {
			await fetcher.delete(url);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
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
		try {
			const response = await fetcher.post(url);
			const { ballots, results } =
				getResultsResponseSchema.parse(response);
			dispatch(updateBallotsLocal(ballots));
			if (selectResultsBallot_id(getState()) === ballot_id)
				dispatch(getSuccess(results));
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return;
		}
	};

export const uploadResults =
	(ballot_id: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseUrl}/${ballot_id}/upload`;
		try {
			const response = await fetcher.postMultipart(url, {
				ResultsFile: file,
			});
			const { ballots, results } =
				getResultsResponseSchema.parse(response);
			dispatch(updateBallotsLocal(ballots));
			if (selectResultsBallot_id(getState()) === ballot_id)
				dispatch(getSuccess(results));
		} catch (error) {
			dispatch(setError("POST " + url, error));
		}
	};
