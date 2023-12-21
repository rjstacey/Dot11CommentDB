import { createAction, EntityId, Action } from "@reduxjs/toolkit";
import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
	isObject,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { updateBallotsLocal } from "./ballots";

export type Voter = {
	id: string;
	ballot_id: number;
	SAPIN: number;
	CurrentSAPIN: number;
	Name: string;
	Email: string;
	Affiliation: string;
	Status: string;
	Excused: boolean;
	VotingPoolID: string;
};

function validVoter(voter: any): voter is Voter {
	return isObject(voter);
}

export type VoterCreate = {
	id?: Voter["id"];
	ballot_id?: Voter["ballot_id"];
	SAPIN: Voter["SAPIN"];
	Excused?: Voter["Excused"];
	Status: Voter["Status"];
};

type BallotVotersUpdate = {
	id: number;
	Voters: number;
};

function validBallotVotersUpdateArray(ballots: any): ballots is BallotVotersUpdate[] {
	return (
		Array.isArray(ballots) &&
		ballots.every(
			(b) => typeof b.id === "number" && typeof b.Voters === "number"
		)
	);
}

export const voterExcusedOptions = [
	{ value: false, label: "No" },
	{ value: true, label: "Yes" },
];

const voterStatus = ["Voter", "ExOfficio"] as const;

export const voterStatusOptions = voterStatus.map((s) => ({
	value: s,
	label: s,
}));

export const fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Email: { label: "Email" },
	Name: { label: "Name" },
	Status: { label: "Status", options: voterStatusOptions },
	Excused: { label: "Excused", options: voterExcusedOptions },
};


const sortComparer = (v1: Voter, v2: Voter) => v1.SAPIN - v2.SAPIN;

type ExtraState = {
	ballot_id: number | null;
};

const initialState: ExtraState = {
	ballot_id: null,
};

export const dataSet = "voters";
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
					}
					state.ballot_id = ballot_id;
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearVoters.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
				}
			);
	},
});

export default slice;

/* Slice actions */
export const votersActions = slice.actions;

const { getSuccess, getFailure, removeMany, setMany } = slice.actions;

// Overload getPending() with one that sets ballot_id
const getPending = createAction<{ ballot_id: number }>(
	dataSet + "/getPending"
);
export const clearVoters = createAction(dataSet + "/clear");


/* Selectors */
export const selectVotersState = (state: RootState) => state[dataSet];
export const selectVotersBallot_id = (state: RootState) =>
	selectVotersState(state).ballot_id;

export const votersSelectors = getAppTableDataSelectors(selectVotersState);

/* Thunk actions */
const baseUrl = "/api/voters";

function validResponse(
	response: any
): response is { voters: Voter[]; ballots?: BallotVotersUpdate[] } {
	return (
		isObject(response) &&
		Array.isArray(response.voters) &&
		response.voters.every(validVoter) &&
		(typeof response.ballots === "undefined" ||
			validBallotVotersUpdateArray(response.ballots))
	);
}

function validGetResponse(response: any): response is Voter[] {
	return Array.isArray(response) && response.every(validVoter);
}

let loadingPromise: Promise<Voter[]>;
export const loadVoters =
	(ballot_id: number): AppThunk<Voter[]> =>
	(dispatch, getState) => {
		const { loading, ballot_id: currentBallot_id } = selectVotersState(
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
				if (!validGetResponse(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(getSuccess(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError(`Unable to get voters`, error));
				return [];
			});
		return loadingPromise;
	};

export const deleteVoters =
	(ids: EntityId[]): AppThunk =>
	async (dispatch) => {
		dispatch(removeMany(ids));
		try {
			await fetcher.delete(baseUrl, ids);
		} catch (error) {
			dispatch(setError(`Unable to delete voters`, error));
		}
	};

export const votersFromSpreadsheet =
	(ballot_id: number, file: File): AppThunk =>
	async (dispatch) => {
		dispatch(getPending({ ballot_id }));
		const url = `${baseUrl}/${ballot_id}/upload`;
		let response: any;
		try {
			response = await fetcher.postMultipart(url, { File: file });
			if (!validResponse(response))
				throw new TypeError(`Unexpected response`);
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to upload voters`, error));
			return;
		}
		dispatch(getSuccess(response.voters));
		if (response.ballots) dispatch(updateBallotsLocal(response.ballots));
	};

export const votersFromMembersSnapshot =
	(ballot_id: number, date: string): AppThunk =>
	async (dispatch) => {
		dispatch(getPending({ ballot_id }));
		const url = `${baseUrl}/${ballot_id}/membersSnapshot`;
		let response: any;
		try {
			response = await fetcher.post(url, { date });
			if (!validResponse(response))
				throw new TypeError("`Unexpected response");
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to create voting pool`, error));
			return;
		}
		dispatch(getSuccess(response.voters));
		if (response.ballots) dispatch(updateBallotsLocal(response.ballots));
	};

export const addVoter =
	(ballot_id: number, voterIn: VoterCreate): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}`;
		let response: any;
		try {
			response = await fetcher.post(url, [voterIn]);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(setError("Unable to add voter", error));
			return;
		}
		dispatch(setMany(response.voters));
		if (response.ballots) dispatch(updateBallotsLocal(response.ballots));
	};

export const updateVoter =
	(id: string, changes: Partial<Voter>): AppThunk =>
	async (dispatch) => {
		let response: any;
		try {
			response = await fetcher.patch(baseUrl, [{ id, changes }]);
			if (!validResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(setError("Unable to update voter", error));
			return;
		}
		dispatch(setMany(response.voters));
	};

export const exportVoters =
	(ballot_id: number): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${ballot_id}/export`;
		try {
			await fetcher.getFile(url);
		} catch (error) {
			dispatch(setError("Unable to export voters", error));
		}
	};
