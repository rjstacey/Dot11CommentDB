import {
	createSlice,
	createEntityAdapter,
	createSelector,
	EntityId,
	PayloadAction,
} from "@reduxjs/toolkit";
import { fetcher, isObject, setError } from "dot11-components";

import type { RootState, AppThunk } from ".";

const GroupTypeLabels = {
	c: "Committee",
	wg: "Working Group",
	sg: "Study Group",
	tg: "Task Group",
	sc: "Standing Committee",
	ah: "Ad-hoc Group",
};

export type GroupType = keyof typeof GroupTypeLabels;

export const GroupTypeOptions = Object.entries(GroupTypeLabels).map(
	([value, label]) =>
		({ value, label } as { value: GroupType; label: string })
);

export const GroupStatusOptions = [
	{ value: 0, label: "Inactive" },
	{ value: 1, label: "Active" },
];

export type Group = {
	id: string;
	parent_id: string | null;
	name: string;
	status: number;
	symbol: string | null;
	color: string;
	type: GroupType | null;
	project: string | null;
	permissions: Record<string, number>;
};

/* Create slice */
const initialState: {
	selectedGroupId: string | null;
	selectedSubgroupId: string | null;
	loading: boolean;
	valid: boolean;
	lastLoad: Record<string, string | null>;
} = {
	selectedGroupId: null,
	selectedSubgroupId: null,
	loading: false,
	valid: false,
	lastLoad: {},
};
const dataAdapter = createEntityAdapter<Group>();
const dataSet = "groups";
const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState(initialState),
	reducers: {
		getPending(state) {
			state.loading = true;
		},
		getSuccess(
			state,
			action: PayloadAction<{ groupName: string; groups: Group[] }>
		) {
			const { groupName, groups } = action.payload;
			state.lastLoad[groupName] = new Date().toISOString();
			state.loading = false;
			state.valid = true;
			dataAdapter.setMany(state, groups);
		},
		getFailure(state) {
			state.loading = false;
			state.valid = false;
		},
		setSelectedGroupId(state, action: PayloadAction<string | null>) {
			state.selectedGroupId = action.payload;
		},
		setSelectedSubgroupId(state, action: PayloadAction<string | null>) {
			state.selectedSubgroupId = action.payload;
		},
		setAll: dataAdapter.setAll,
		setMany: dataAdapter.setMany,
	},
});

export default slice;

/* Slice actions */
const { getPending, getSuccess, getFailure } = slice.actions;
export const { setSelectedGroupId, setSelectedSubgroupId } = slice.actions;

/* Selectors */
export const selectGroupsState = (state: RootState) => state[dataSet];
export function selectGroupEntities(state: RootState) {
	return selectGroupsState(state).entities;
}
export const selectGroupIds = (state: RootState) =>
	selectGroupsState(state).ids;
const selectGroupsAge = (state: RootState, groupName: string) => {
	let lastLoad = selectGroupsState(state).lastLoad[groupName];
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectSelectedGroupId = (state: RootState) =>
	selectGroupsState(state).selectedGroupId;
export const selectSelectedSubgroupId = (state: RootState) =>
	selectGroupsState(state).selectedSubgroupId;

export const selectGroup = (state: RootState, groupId: string) =>
	selectGroupEntities(state)[groupId];

export const selectTopLevelGroups = createSelector(
	selectGroupIds,
	selectGroupEntities,
	(ids, entities) =>
		ids
			.map((id) => entities[id]!)
			.filter((g) => ["r", "c", "wg"].includes(g.type!))
);

export const selectGroupByName = (state: RootState, groupName: string) => {
	const groups = selectTopLevelGroups(state);
	return groups.find((g) => g.name === groupName);
};

export const selectSelectedGroup = (state: RootState) => {
	const { selectedGroupId, entities } = selectGroupsState(state);
	return (selectedGroupId && entities[selectedGroupId]) || undefined;
};

export const selectSubgroupIds = createSelector(
	selectGroupIds,
	selectGroupEntities,
	selectSelectedGroupId,
	(ids, entities, selectedGroupId) => {
		function isSelectedGroupDescendent(id: EntityId) {
			if (id === selectedGroupId) return true;
			let g: Group | undefined = entities[id]!;
			do {
				if (g.parent_id === selectedGroupId) return true; // id is descendent of ownerGroupId
				g = g.parent_id ? entities[g.parent_id] : undefined;
			} while (g);
			return false; // id is not an descendent of ownerGroupId
		}
		return ids.filter(isSelectedGroupDescendent);
	}
);

export const selectSubgroups = createSelector(
	selectSubgroupIds,
	selectGroupEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectSubgroupByName = (state: RootState, groupName: string) => {
	const groups = selectSubgroups(state);
	return groups.find((g) => g.name === groupName);
};

export const selectSelectedSubgroup = (state: RootState) => {
	const { selectedSubgroupId, entities } = selectGroupsState(state);
	return (selectedSubgroupId && entities[selectedSubgroupId]) || undefined;
};

/** Select group permissions */
export const selectGroupPermissions = (
	state: RootState,
	groupId: string
): Record<string, number> => {
	const group = selectGroup(state, groupId);
	return group ? group.permissions : {};
};

/* Thunk actions */
const baseUrl = "/api/groups";

function validGroup(group: any): group is Group {
	return isObject(group) && group.id && typeof group.id === "string";
}

function validResponse(response: any): response is Group[] {
	return Array.isArray(response) && response.every(validGroup);
}

const AGE_STALE = 60 * 60 * 1000; // 1 hour

const loading: Record<string, boolean> = {};
const loadingPromise: Record<string, Promise<void> | undefined> = {};
export const loadGroups =
	(groupName: string = "", force = false): AppThunk<void> =>
	async (dispatch, getState) => {
		if (loading[groupName]) return loadingPromise[groupName];
		const age = selectGroupsAge(getState(), groupName);
		if (!isNaN(age) && !force && age < AGE_STALE) return;
		dispatch(getPending());
		const url = groupName ? `${baseUrl}/${groupName}` : baseUrl;
		loading[groupName] = true;
		loadingPromise[groupName] = fetcher
			.get(url, groupName ? undefined : { type: ["c", "wg"] })
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(getSuccess({ groupName, groups: response }));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get groups", error));
			})
			.finally(() => {
				loading[groupName] = false;
			});
		return loadingPromise[groupName]!;
	};
