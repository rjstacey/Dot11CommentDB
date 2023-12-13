import {
	createSlice,
	createEntityAdapter,
	createAction,
} from "@reduxjs/toolkit";
import type { Dictionary, EntityId, PayloadAction } from "@reduxjs/toolkit";

import { v4 as uuid } from "uuid";
import type { RootState, AppThunk } from ".";

import { fetcher, setError } from "dot11-components";
import { selectWorkingGroupName } from "./groups";

export type OfficerId = string;
export type Officer = {
	id: OfficerId;
	sapin: number;
	position: string;
	group_id: string;
};
export type OfficerCreate = Omit<Officer, "id"> & Partial<Pick<Officer, "id">>;
export type OfficerUpdate = {
	id: OfficerId;
	changes: Partial<Officer>;
};

export const officerPositions = [
	"Chair",
	"Vice chair",
	"Secretary",
	"Technical editor",
	"Other",
];

// Compare funciton for sorting officers by position
export function officerCmp(o1: Officer, o2: Officer) {
	let i1 = officerPositions.indexOf(o1.position);
	if (i1 < 0) i1 = officerPositions.length;
	let i2 = officerPositions.indexOf(o2.position);
	if (i2 < 0) i2 = officerPositions.length;
	return i1 - i2;
}

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
};

const dataAdapter = createEntityAdapter<Officer>({});
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
});

export type OfficersState = typeof initialState;

const dataSet = "officers";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string | null }>) {
			const { groupName } = action.payload;
			state.loading = true;
			if (state.groupName !== groupName) {
				state.groupName = action.payload.groupName;
				state.valid = false;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		addMany: dataAdapter.addMany,
		updateMany: dataAdapter.updateMany,
		removeMany: dataAdapter.removeMany,
		setMany: dataAdapter.setMany,
	},
});

export default slice;

/*
 * Selectors
 */
export function getGroupOfficers(
	officerIds: EntityId[],
	officerEntities: Dictionary<Officer>,
	group_id: EntityId
) {
	return officerIds
		.map((id) => officerEntities[id]!)
		.filter((officer) => officer.group_id === group_id)
		.sort(officerCmp);
}

export const selectOfficersState = (state: RootState) => state[dataSet];
export const selectOfficerEntities = (state: RootState) =>
	selectOfficersState(state).entities;

export function selectGroupOfficers(state: RootState, group_id: EntityId) {
	const { ids, entities } = selectOfficersState(state);
	return getGroupOfficers(ids, entities, group_id);
}

/*
 * Actions
 */
const { getSuccess, getFailure, addMany, updateMany, removeMany, setMany } =
	slice.actions;

// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearOfficers = createAction(dataSet + "/clear");

export const loadOfficers =
	(groupName: string): AppThunk =>
	(dispatch, getState) => {
		const url = `/api/${groupName}/officers`;
		dispatch(getPending({ groupName }));
		return fetcher
			.get(url)
			.then((officers: any) => {
				if (!Array.isArray(officers))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(officers));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get groups", error));
			});
	};

export const addOfficers =
	(officers: OfficerCreate[]): AppThunk =>
	(dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/officers`;
		const newOfficers = officers.map<Officer>(
			(officer) =>
				(officer.id ? officer : { ...officer, id: uuid() }) as Officer
		);
		dispatch(addMany(newOfficers));
		return fetcher
			.post(url, newOfficers)
			.then((entities: any) => {
				if (
					!Array.isArray(entities) ||
					entities.length !== newOfficers.length
				)
					throw new TypeError(`Unexpected response to POST ${url}`);
			})
			.catch((error: any) => {
				dispatch(setError("Unable to add officer", error));
				dispatch(removeMany(newOfficers.map((o) => o.id)));
			});
	};

export const updateOfficers =
	(updates: OfficerUpdate[]): AppThunk =>
	(dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/officers`;
		const entities = selectOfficerEntities(getState());
		const originals = updates.map((u) => entities[u.id]!);
		dispatch(updateMany(updates));
		return fetcher
			.patch(url, updates)
			.then((entities: any) => {
				if (
					!Array.isArray(entities) ||
					entities.length !== updates.length
				)
					throw new TypeError(`Unexpected response to POST ${url}`);
			})
			.catch((error: any) => {
				dispatch(setError("Unable to update officer", error));
				dispatch(setMany(originals));
			});
	};

export const deleteOfficers =
	(ids: EntityId[]): AppThunk =>
	(dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/officers`;
		const entities = selectOfficerEntities(getState());
		const originals = ids.map((id) => entities[id]!);
		dispatch(removeMany(ids));
		return fetcher.delete(url, ids).catch((error: any) => {
			dispatch(setError("Unable to delete officer", error));
			dispatch(addMany(originals));
		});
	};
