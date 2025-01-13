import { createAction, EntityId, Action } from "@reduxjs/toolkit";
import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { updateBallotsLocal } from "./ballots";
import {
	Voter,
	VoterCreate,
	votersResponseSchema,
	votersSchema,
} from "@schemas/voters";

export type { Voter, VoterCreate };

export const voterExcusedOptions = [
	{ value: false, label: "No" },
	{ value: true, label: "Yes" },
];

const voterStatus = ["Voter", "ExOfficio"] as const;

export const voterStatusOptions = voterStatus.map((s) => ({
	value: s,
	label: s,
}));

export const fields: Fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Email: { label: "Email" },
	Name: { label: "Name" },
	Status: { label: "Status", options: voterStatusOptions },
	Excused: { label: "Excused", options: voterExcusedOptions },
};

const initialState = {
	ballot_id: null as number | null,
	lastLoad: null as string | null,
};
const sortComparer = (v1: Voter, v2: Voter) => v1.SAPIN - v2.SAPIN;
const dataSet = "voters";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { ballot_id } = action.payload;
					if (ballot_id !== state.ballot_id) {
						dataAdapter.removeAll(state);
						state.valid = false;
						state.ballot_id = ballot_id;
					}
					state.lastLoad = new Date().toISOString();
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearVoters.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
					state.ballot_id = null;
				}
			);
	},
});

export default slice;

/* Slice actions */
export const votersActions = slice.actions;

const { getSuccess, getFailure, removeMany, setMany } = slice.actions;

// Overload getPending() with one that sets ballot_id
const getPending = createAction<{ ballot_id: number }>(dataSet + "/getPending");
export const clearVoters = createAction(dataSet + "/clear");

/* Selectors */
export const selectVotersState = (state: RootState) => state[dataSet];
const selectVotersAge = (state: RootState) => {
	const lastLoad = selectVotersState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectVotersBallot_id = (state: RootState) =>
	selectVotersState(state).ballot_id;

export const votersSelectors = getAppTableDataSelectors(selectVotersState);

/* Thunk actions */
const baseUrl = "/api/voters";

const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadVoters =
	(ballot_id: number, force = false): AppThunk =>
	(dispatch, getState) => {
		const state = getState();
		const currentBallot_id = selectVotersState(state).ballot_id;
		if (currentBallot_id === ballot_id) {
			if (loading) return loadingPromise;
			const age = selectVotersAge(state);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ ballot_id }));
		const url = `${baseUrl}/${ballot_id}`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: unknown) => {
				const voters = votersSchema.parse(response);
				dispatch(getSuccess(voters));
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const refreshVoters = (): AppThunk => async (dispatch, getState) => {
	const ballot_id = selectVotersState(getState()).ballot_id;
	dispatch(ballot_id ? loadVoters(ballot_id, true) : clearVoters());
};

export const deleteVoters =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const ballot_id = selectVotersBallot_id(getState());
		const url = `${baseUrl}/${ballot_id}`;
		dispatch(removeMany(ids));
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
		}
	};

export const votersFromSpreadsheet =
	(ballot_id: number, file: File): AppThunk =>
	async (dispatch) => {
		dispatch(getPending({ ballot_id }));
		const url = `${baseUrl}/${ballot_id}/upload`;
		try {
			const response = await fetcher.postMultipart(url, { File: file });
			const { voters, ballots } = votersResponseSchema.parse(response);
			dispatch(getSuccess(voters));
			if (ballots) dispatch(updateBallotsLocal(ballots));
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError("POST " + url, error));
		}
	};

export const votersFromMembersSnapshot =
	(ballot_id: number, date: string): AppThunk =>
	async (dispatch) => {
		dispatch(getPending({ ballot_id }));
		const url = `${baseUrl}/${ballot_id}/membersSnapshot`;
		try {
			const response = await fetcher.post(url, { date });
			const { voters, ballots } = votersResponseSchema.parse(response);
			dispatch(getSuccess(voters));
			if (ballots) dispatch(updateBallotsLocal(ballots));
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError("POST " + url, error));
		}
	};

export const addVoter =
	(voterIn: VoterCreate): AppThunk =>
	async (dispatch, getState) => {
		const ballot_id = selectVotersBallot_id(getState());
		const url = `${baseUrl}/${ballot_id}`;
		try {
			const response = await fetcher.post(url, [voterIn]);
			const { voters, ballots } = votersResponseSchema.parse(response);
			dispatch(setMany(voters));
			if (ballots) dispatch(updateBallotsLocal(ballots));
		} catch (error) {
			dispatch(setError("POST " + url, error));
		}
	};

export const updateVoter =
	(id: string, changes: Partial<Voter>): AppThunk =>
	async (dispatch, getState) => {
		const ballot_id = selectVotersBallot_id(getState());
		const url = `${baseUrl}/${ballot_id}`;
		try {
			const response = await fetcher.patch(url, [{ id, changes }]);
			const { voters } = votersResponseSchema.parse(response);
			dispatch(setMany(voters));
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
		}
	};

export const exportVoters =
	(ballot_id: number): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/export`;
		try {
			await fetcher.getFile(url);
		} catch (error) {
			dispatch(setError("GET " + url, error));
		}
	};
