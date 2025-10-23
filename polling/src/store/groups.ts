import {
	createSlice,
	createEntityAdapter,
	createSelector,
	PayloadAction,
	EntityId,
	Dictionary,
} from "@reduxjs/toolkit";

import { fetcher } from "@common";

import type { RootState, AppThunk } from ".";
import { setError } from ".";
import { groupsSchema, groupTypesOrdered } from "@schemas/groups";
import type {
	GroupType,
	Group,
	GroupCreate,
	GroupUpdate,
} from "@schemas/groups";
export type { GroupType, Group, GroupCreate, GroupUpdate };

const topLevelGroupTypes = ["r", "c", "wg"] as const satisfies GroupType[];

function arrangeIdsHeirarchically(
	ids: EntityId[],
	entities: Dictionary<Group>
) {
	interface Node {
		id: EntityId;
		children: Node[];
	}

	// Order by group type and then alphabetically
	function compare(id1: EntityId, id2: EntityId) {
		const g1 = entities[id1]!;
		const g2 = entities[id2]!;
		const g1TypeIndex = g1.type
			? groupTypesOrdered.indexOf(g1.type)
			: groupTypesOrdered.length;
		const g2TypeIndex = g2.type
			? groupTypesOrdered.indexOf(g2.type)
			: groupTypesOrdered.length;
		let n = g1TypeIndex - g2TypeIndex;
		if (n === 0) n = g1.name.localeCompare(g2.name);
		return n;
	}

	function buildTree(parent_id: EntityId | null): Node[] {
		return ids
			.filter((id) => entities[id]!.parent_id === parent_id)
			.sort(compare)
			.map((id) => ({ id, children: buildTree(id) }));
	}

	function flattenTree(nodes: Node[]): EntityId[] {
		let ids: EntityId[] = [];
		for (const node of nodes)
			ids = ids.concat(node.id, flattenTree(node.children));
		return ids;
	}

	const nodes = buildTree(null);
	const sortedIds = flattenTree(nodes);

	if (ids.length !== sortedIds.length) {
		console.warn("One or more groups present without its parent");
		return ids;
	}

	return sortedIds.join() !== ids.join() ? sortedIds : ids;
}

/* Create slice */
const dataSet = "groups";
const dataAdapter = createEntityAdapter<Group>();
const initialState: {
	topLevelGroupId: string | null;
	selectedGroupId: string | null;
	lastLoad: Record<string, string | null>;
	loading: boolean;
	valid: boolean;
} = {
	topLevelGroupId: null,
	selectedGroupId: null,
	lastLoad: {},
	loading: false,
	valid: false,
};
const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState(initialState),
	reducers: {
		setTopLevelGroupId(state, action: PayloadAction<string | null>) {
			state.topLevelGroupId = action.payload;
		},
		setSelectedGroupId(state, action: PayloadAction<string | null>) {
			state.selectedGroupId = action.payload;
		},
		getPending(state, action: PayloadAction<{ groupName: string }>) {
			const { groupName } = action.payload;
			state.loading = true;
			state.lastLoad[groupName] = new Date().toISOString();
		},
		getFailure(state) {
			state.loading = false;
		},
		getSuccess(state, action: PayloadAction<Group[]>) {
			const groups = action.payload;
			dataAdapter.setMany(state, groups); // add or replace
			state.loading = false;
			state.valid = true;
			state.ids = arrangeIdsHeirarchically(state.ids, state.entities);
		},
	},
});

export default slice;

/* Slice actions */
const {
	getPending,
	getFailure,
	getSuccess,
	setTopLevelGroupId,
	setSelectedGroupId,
} = slice.actions;
export { setTopLevelGroupId, setSelectedGroupId };

/* Selectors */
export const selectGroupsState = (state: RootState) => state[dataSet];
export const selectGroupEntities = (state: RootState) =>
	selectGroupsState(state).entities;
export const selectGroupIds = (state: RootState) =>
	selectGroupsState(state).ids;
const selectGroupsAge = (state: RootState, groupName: string) => {
	const lastLoad = selectGroupsState(state).lastLoad[groupName];
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectTopLevelGroupId = (state: RootState) =>
	selectGroupsState(state).topLevelGroupId;
export const selectSelectedGroupId = (state: RootState) =>
	selectGroupsState(state).selectedGroupId;

export const selectTopLevelGroups = createSelector(
	selectGroupIds,
	selectGroupEntities,
	(ids, entities) =>
		ids
			.map((id) => entities[id]!)
			.filter((g) => topLevelGroupTypes.includes(g.type as any)) // eslint-disable-line @typescript-eslint/no-explicit-any
);

/** Select top level group by name. Only for root (r), committee (c) and working group (wg). Root is selected with groupName = "". */
export const selectTopLevelGroupByName = (
	state: RootState,
	groupName: string
) => {
	const groups = selectTopLevelGroups(state);
	return groups.find((g) =>
		groupName
			? (g.type === "c" || g.type === "wg") && g.name === groupName
			: g.type === "r"
	);
};

export const selectTopLevelGroup = (state: RootState) => {
	const { topLevelGroupId, entities } = selectGroupsState(state);
	return (topLevelGroupId && entities[topLevelGroupId]) || undefined;
};
export const selectTopLevelGroupName = (state: RootState) =>
	selectTopLevelGroup(state)?.name || "";

export const selectSelectedGroup = (state: RootState) => {
	const { selectedGroupId, entities } = selectGroupsState(state);
	return (selectedGroupId && entities[selectedGroupId]) || undefined;
};

export const selectSubgroupIds = createSelector(
	selectGroupIds,
	selectGroupEntities,
	selectTopLevelGroupId,
	(ids, entities, topLevelGroupId) => {
		if (topLevelGroupId) {
			const parent = entities[topLevelGroupId];
			if (parent && (parent.type === "r" || parent.type === "c")) {
				ids = ids.filter(
					(id) =>
						topLevelGroupTypes.includes(entities[id]!.type as any) // eslint-disable-line @typescript-eslint/no-explicit-any
				);
			}
			function isDescendent(id: EntityId) {
				if (id === topLevelGroupId) return true;
				let g: Group | undefined = entities[id]!;
				do {
					if (g.parent_id === topLevelGroupId) return true; // id is descendent of ownerGroupId
					g = g.parent_id ? entities[g.parent_id] : undefined;
				} while (g);
				return false; // id is not an descendent of ownerGroupId
			}
			return ids.filter(isDescendent);
		} else {
			return ids.filter(
				(id) => topLevelGroupTypes.includes(entities[id]!.type as any) // eslint-disable-line @typescript-eslint/no-explicit-any
			);
		}
	}
);

export const selectSubgroups = createSelector(
	selectSubgroupIds,
	selectGroupEntities,
	(ids, entities) =>
		ids
			.map((id, i) => {
				let g = entities[id]!;
				// The first entry is the top level group. Change name to "R", "C", or "WG"
				if (i === 0) g = { ...g, name: g.type!.toLocaleUpperCase() };
				return g;
			})
			.filter((g) => g.status)
);

/** Select subgroup by name. */
export const selectSubgroupByName = (
	state: RootState,
	subgroupName: string
) => {
	const groups = selectSubgroups(state);
	return groups.find((g) => g.name === subgroupName);
};

export const selectTopLevelGroupParents = createSelector(
	selectGroupEntities,
	selectTopLevelGroupId,
	(entities, topLevelGroupId) => {
		const groups: Group[] = [];
		while (topLevelGroupId) {
			const group = entities[topLevelGroupId];
			if (group) {
				groups.unshift(group);
				topLevelGroupId = group.parent_id;
			} else {
				topLevelGroupId = null;
			}
		}
		return groups;
	}
);

export const selectGroup = (state: RootState, groupId: string) =>
	selectGroupsState(state).entities[groupId];

export const selectGroupPermissions = (
	state: RootState,
	groupId: string
): Record<string, number> => {
	const group = selectGroup(state, groupId);
	return group ? group.permissions : {};
};

/* Thunk actions */
const baseUrl = "/api/groups";
const AGE_STALE = 60 * 60 * 1000; // 1 hour
const loadingPromise: Record<string, Promise<Group[]> | undefined> = {};
export const loadGroups =
	(groupName: string = ""): AppThunk<Group[]> =>
	async (dispatch, getState) => {
		if (groupName) {
			await loadingPromise[""];
			if (selectTopLevelGroup(getState())?.name !== groupName) {
				const group = selectTopLevelGroupByName(getState(), groupName);
				if (!group) {
					setError(
						"Unable to load subgroups",
						"Invalid top level group: " + groupName
					);
					return [];
				}
				dispatch(setTopLevelGroupId(group.id));
			}
		}
		if (loadingPromise[groupName]) {
			return loadingPromise[groupName]!;
		}
		const age = selectGroupsAge(getState(), groupName);
		if (age && age < AGE_STALE) {
			return loadingPromise[groupName]!;
		}
		dispatch(getPending({ groupName }));
		const url = groupName ? `${baseUrl}/${groupName}` : baseUrl;
		loadingPromise[groupName] = fetcher
			.get(url, groupName ? undefined : { type: ["c", "wg"] })
			.then((response: unknown) => {
				const groups = groupsSchema.parse(response);
				dispatch(getSuccess(groups));
				return groups;
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
				return [];
			})
			.finally(() => {
				delete loadingPromise[groupName];
			});
		return loadingPromise[groupName]!;
	};
