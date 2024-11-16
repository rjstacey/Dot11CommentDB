import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import type { Dictionary, EntityId, PayloadAction } from "@reduxjs/toolkit";

import { v4 as uuid } from "uuid";
import type { RootState, AppThunk } from ".";

import { fetcher, setError } from "dot11-components";
import { GroupType } from "./groups";

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

export function officerPositionsForGroupType(groupType: GroupType) {
	if (groupType === "r") return ["Admin"];
	return officerPositions;
}

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
	lastLoad: string | null;
};

/* Create slice */
const dataAdapter = createEntityAdapter<Officer>({});
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
	lastLoad: null,
});
const dataSet = "officers";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string }>) {
			const { groupName } = action.payload;
			state.loading = true;
			state.lastLoad = new Date().toISOString();
			if (state.groupName !== groupName) {
				state.groupName = groupName;
				state.valid = false;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action: PayloadAction<Officer[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		clear(state) {
			state.lastLoad = null;
			state.groupName = null;
			state.valid = false;
			dataAdapter.removeAll(state);
		},
		addMany: dataAdapter.addMany,
		updateMany: dataAdapter.updateMany,
		removeMany: dataAdapter.removeMany,
		setMany: dataAdapter.setMany,
	},
});

export default slice;

/* Slice actions */
const {
	getPending,
	getSuccess,
	getFailure,
	clear: clearOfficers,
	addMany,
	updateMany,
	removeMany,
	setMany,
} = slice.actions;

export { clearOfficers };

/* Selectors */
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
export const selectOfficerIds = (state: RootState) =>
	selectOfficersState(state).ids;
export const selectOfficerEntities = (state: RootState) =>
	selectOfficersState(state).entities;
const selectOfficersAge = (state: RootState) => {
	let lastLoad = selectOfficersState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};

/*
 * Thunk actions
 */

const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loadingPromise: Promise<Officer[]>;
export const loadOfficers =
	(groupName: string): AppThunk<Officer[]> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } = selectOfficersState(
			getState()
		);
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectOfficersAge(getState());
			if (age && age < AGE_STALE) return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		loadingPromise = fetcher
			.get(`/api/${groupName}/officers`)
			.then((officers: any) => {
				if (!Array.isArray(officers))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess(officers));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get groups", error));
			});
		return loadingPromise;
	};

export const addOfficers =
	(officers: OfficerCreate[]): AppThunk =>
	(dispatch, getState) => {
		const { groupName } = selectOfficersState(getState());
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
		const { groupName } = selectOfficersState(getState());
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
		const { groupName } = selectOfficersState(getState());
		const url = `/api/${groupName}/officers`;
		const entities = selectOfficerEntities(getState());
		const originals = ids.map((id) => entities[id]!);
		dispatch(removeMany(ids));
		return fetcher.delete(url, ids).catch((error: any) => {
			dispatch(setError("Unable to delete officer", error));
			dispatch(addMany(originals));
		});
	};
