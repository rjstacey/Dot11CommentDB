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
	workingGroupId: string | null;
	loading: boolean;
	valid: boolean;
	lastLoad: Record<string, string | null>;
} = {
	workingGroupId: null,
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
		setWorkingGroupId(state, action: PayloadAction<string | null>) {
			state.workingGroupId = action.payload;
		},
		setAll: dataAdapter.setAll,
		setMany: dataAdapter.setMany,
	},
});

export default slice;

/* Slice actions */
const { getPending, getSuccess, getFailure, setWorkingGroupId } = slice.actions;

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
export const selectWorkingGroupId = (state: RootState) =>
	selectGroupsState(state).workingGroupId;

export const selectWorkingGroupIds = createSelector(
	selectGroupIds,
	selectGroupEntities,
	selectWorkingGroupId,
	(ids, entities, workingGroupId) => {
		if (workingGroupId) {
			function isWorkingGroupDescendent(id: EntityId) {
				if (id === workingGroupId) return true;
				let g: Group | undefined = entities[id]!;
				do {
					if (g.parent_id === workingGroupId) return true; // id is descendent of ownerGroupId
					g = g.parent_id ? entities[g.parent_id] : undefined;
				} while (g);
				return false; // id is not an descendent of ownerGroupId
			}
			return ids.filter(isWorkingGroupDescendent);
		} else {
			return ids.filter((id) => {
				let g = entities[id]!;
				return g.type === "wg";
			});
		}
	}
);

export const selectGroups = createSelector(
	selectWorkingGroupIds,
	selectGroupEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectGroup = (state: RootState, groupId: string) =>
	selectGroupEntities(state)[groupId];
export const selectWorkingGroups = (state: RootState) => {
	const { ids, entities } = selectGroupsState(state);
	return ids.map((id) => entities[id]!).filter((g) => g.type === "wg");
};
export const selectWorkingGroupByName = (
	state: RootState,
	groupName: string
) => {
	const groups = selectWorkingGroups(state);
	return groups.find((g) => g.name === groupName);
};

export const selectWorkingGroup = (state: RootState) => {
	const { workingGroupId, entities } = selectGroupsState(state);
	return (workingGroupId && entities[workingGroupId]) || undefined;
};
export const selectWorkingGroupName = (state: RootState) =>
	selectWorkingGroup(state)?.name || "";

export const selectWorkingGroupPermissions = (state: RootState) =>
	selectWorkingGroup(state)?.permissions || {};

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

const loadingPromise: Record<string, Promise<Group[]> | undefined> = {};
export const loadGroups =
	(groupName: string = ""): AppThunk<Group[]> =>
	async (dispatch, getState) => {
		if (groupName) {
			await loadingPromise[""];
			if (selectWorkingGroup(getState())?.name !== groupName) {
				const group = selectWorkingGroupByName(getState(), groupName);
				if (!group) {
					setError(
						"Unable to load subgroups",
						"Invalid working group: " + groupName
					);
					return [];
				}
				dispatch(setWorkingGroupId(group.id));
			}
		}
		if (loadingPromise[groupName]) {
			return loadingPromise[groupName]!;
		}
		const age = selectGroupsAge(getState(), groupName);
		if (age && age < AGE_STALE) {
			return loadingPromise[groupName]!;
		}
		dispatch(getPending());
		const url = groupName ? `${baseUrl}/${groupName}` : baseUrl;
		loadingPromise[groupName] = fetcher
			.get(url, groupName ? undefined : { type: ["c", "wg"] })
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(getSuccess({ groupName, groups: response }));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get groups", error));
				return [];
			})
			.finally(() => {
				delete loadingPromise[groupName];
			});
		return loadingPromise[groupName]!;
	};
