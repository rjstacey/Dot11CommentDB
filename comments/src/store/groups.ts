import {
	createAction,
	createSelector,
	Action,
	PayloadAction,
	EntityId,
} from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	Fields,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import {
	GroupType,
	Group,
	GroupCreate,
	GroupUpdate,
	groupsSchema,
} from "@schemas/groups";
export type { GroupType, Group, GroupCreate, GroupUpdate };

export const GroupTypeLabels: Record<GroupType, string> = {
	r: "Root",
	c: "Committee",
	wg: "Working Group",
	sg: "Study Group",
	tg: "Task Group",
	sc: "Standing Committee",
	ah: "Ad-hoc Group",
	tig: "Topic Interest Group",
} as const;

export const GroupTypeOptions = Object.entries(GroupTypeLabels).map(
	([value, label]) =>
		({ value, label } as { value: GroupType; label: string })
);
const groupTypes = Object.keys(GroupTypeLabels);

export const GroupStatusOptions = [
	{ value: 0, label: "Inactive" },
	{ value: 1, label: "Active" },
];

export const fields: Fields = {
	id: {},
	parent_id: {},
	name: { label: "Group" },
	type: { label: "Type", dataRenderer: (v: GroupType) => GroupTypeLabels[v] },
	status: {
		label: "Status",
		dataRenderer: (v: number) => (v ? "Active" : "Inactive"),
	},
	symbol: { label: "Committee" },
};

/* Create slice */
const dataSet = "groups";
const initialState: {
	topLevelGroupId: string | null;
	lastLoad: Record<string, string | null>;
} = {
	topLevelGroupId: null,
	lastLoad: {},
};
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId: (e: Group) => e.id,
	reducers: {
		setTopLevelGroupId(state, action: PayloadAction<string | null>) {
			state.topLevelGroupId = action.payload;
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder.addMatcher(
			(action: Action) => action.type === getSuccess2.toString(),
			(
				state,
				action: PayloadAction<{ groupName: string; groups: Group[] }>
			) => {
				const { groupName, groups } = action.payload;
				state.lastLoad[groupName] = new Date().toISOString();
				dataAdapter.setMany(state, groups); // add or replace
				state.loading = false;
				state.valid = true;
				const { ids, entities } = state;

				interface Node {
					id: EntityId;
					children: Node[];
				}

				// Order by group type and then alphabetically
				function compare(id1: EntityId, id2: EntityId) {
					const g1 = entities[id1]!;
					const g2 = entities[id2]!;
					let n =
						groupTypes.indexOf(g1.type || "") -
						groupTypes.indexOf(g2.type || "");
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
					console.warn(
						"One or more groups present without its parent"
					);
				} else {
					if (sortedIds.join() !== ids.join()) state.ids = sortedIds;
				}
			}
		);
	},
});

export default slice;

/* Slice actions */
export const groupsActions = slice.actions;

const {
	getPending,
	getFailure,
	setSelected,
	setFilter,
	clearFilter,
	setTopLevelGroupId,
} = slice.actions;

const getSuccess2 = createAction<{ groupName: string; groups: Group[] }>(
	dataSet + "/getSuccess2"
);

export { setSelected, setFilter, clearFilter, setTopLevelGroupId };

/* Selectors */
export const selectGroupsState = (state: RootState) => state[dataSet];
export const selectGroupEntities = (state: RootState) =>
	selectGroupsState(state).entities;
export const selectGroupIds = (state: RootState) =>
	selectGroupsState(state).ids;
const selectGroupsAge = (state: RootState, groupName: string) => {
	let lastLoad = selectGroupsState(state).lastLoad[groupName];
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};

export const selectWorkingGroups = (state: RootState) => {
	const { ids, entities } = selectGroupsState(state);
	return ids
		.map((id) => entities[id]!)
		.filter((g) => ["r", "c", "wg"].includes(g.type!));
};

/** Select top level group by name. Only for root ("r"), committee (c) and working group (wg). Root is selected with groupName = "". */
export const selectTopLevelGroupByName = (
	state: RootState,
	groupName: string
) => {
	const groups = selectWorkingGroups(state);
	return groups.find((g) =>
		groupName
			? (g.type === "c" || g.type === "wg") && g.name === groupName
			: g.type === "r"
	);
};

export const selectTopLevelGroupId = (state: RootState) =>
	selectGroupsState(state).topLevelGroupId;
export const selectWorkingGroup = (state: RootState) => {
	const { topLevelGroupId, entities } = selectGroupsState(state);
	return (topLevelGroupId && entities[topLevelGroupId]) || undefined;
};
export const selectWorkingGroupName = (state: RootState) =>
	selectWorkingGroup(state)?.name || "";

export const selectWorkingGroupIds = createSelector(
	selectGroupIds,
	selectGroupEntities,
	selectTopLevelGroupId,
	(ids, entities, topLevelGroupId) => {
		if (topLevelGroupId) {
			const parent = entities[topLevelGroupId];
			if (parent && (parent.type === "r" || parent.type === "c")) {
				ids = ids.filter((id) =>
					["r", "c", "wg"].includes(entities[id]!.type!)
				);
			}
			function isWorkingGroupDescendent(id: EntityId) {
				if (id === topLevelGroupId) return true;
				let g: Group | undefined = entities[id]!;
				do {
					if (g.parent_id === topLevelGroupId) return true; // id is descendent of ownerGroupId
					g = g.parent_id ? entities[g.parent_id] : undefined;
				} while (g);
				return false; // id is not an descendent of ownerGroupId
			}
			return ids.filter(isWorkingGroupDescendent);
		} else {
			return ids.filter((id) => {
				let g = entities[id]!;
				return g.type === "c" || g.type === "wg";
			});
		}
	}
);

export const selectGroups = createSelector(
	selectWorkingGroupIds,
	selectGroupEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectGroupParents = createSelector(
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

export const groupsSelectors = getAppTableDataSelectors(selectGroupsState);

/* Thunk actions */
const baseUrl = "/api/groups";

const AGE_STALE = 60 * 60 * 1000; // 1 hour

const loadingPromise: Record<string, Promise<Group[]> | undefined> = {};
export const loadGroups =
	(groupName: string = ""): AppThunk<Group[]> =>
	async (dispatch, getState) => {
		if (groupName) {
			await loadingPromise[""];
			if (selectWorkingGroup(getState())?.name !== groupName) {
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
		dispatch(getPending());
		const url = groupName ? `${baseUrl}/${groupName}` : baseUrl;
		loadingPromise[groupName] = fetcher
			.get(url, groupName ? undefined : { type: ["c", "wg"] })
			.then((response: any) => {
				const groups = groupsSchema.parse(response);
				dispatch(getSuccess2({ groupName, groups }));
				return groups;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
				return [];
			})
			.finally(() => {
				delete loadingPromise[groupName];
			});
		return loadingPromise[groupName]!;
	};
