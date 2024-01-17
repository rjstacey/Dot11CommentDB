import {
	Action,
	EntityId,
	PayloadAction,
	createAction,
	createSelector,
} from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	isObject,
} from "dot11-components";

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
const groupTypes = Object.keys(GroupTypeLabels);

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
	color: string | null;
	type: GroupType | null;
	project: string | null;
	permissions: Record<string, number>;
};

export type GroupCreate = Omit<Group, "id"> & { id?: string };

function validGroup(group: any): group is Group {
	const isGood =
		isObject(group) &&
		typeof group.id === "string" &&
		(group.parent_id === null || typeof group.parent_id === "string") &&
		typeof group.name === "string" &&
		(group.symbol === null || typeof group.symbol === "string") &&
		(group.color === null || typeof group.color === "string");
	if (!isGood) console.log(group);
	return isGood;
}

export const fields = {
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
	workingGroupId: string | null;
} = {
	workingGroupId: null,
};
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId: (e: Group) => e.id,
	reducers: {
		setWorkingGroupId(state, action: PayloadAction<string | null>) {
			state.workingGroupId = action.payload;
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder.addMatcher(
			(action: Action) => action.type === getSuccess2.toString(),
			(state, action: PayloadAction<Group[]>) => {
				dataAdapter.addMany(state, action.payload);
				state.loading = false;
				state.valid = true;
				const { ids, entities } = state;

				interface Node { id: EntityId; children: Node[]; }

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
						.filter(id => entities[id]!.parent_id === parent_id)
						.sort(compare)
						.map(id => ({ id, children: buildTree(id) }));
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
				}
				else {
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
	setWorkingGroupId,
} = slice.actions;

export { setSelected, setFilter, clearFilter, setWorkingGroupId };
const getSuccess2 = createAction<Group[]>(dataSet + "/getSuccess2");

/* Selectors */
export const selectGroupsState = (state: RootState) => state[dataSet];
export const selectGroupEntities = (state: RootState) =>
	selectGroupsState(state).entities;
export const selectGroupIds = (state: RootState) =>
	selectGroupsState(state).ids;

export const selectWorkingGroups = (state: RootState) => {
	const { ids, entities } = selectGroupsState(state);
	return ids
		.map((id) => entities[id]!)
		.filter((g) => g.type === "c" || g.type === "wg");
};
export const selectWorkingGroupByName = (
	state: RootState,
	groupName: string
) => {
	const groups = selectWorkingGroups(state);
	return groups.find((g) => g.name === groupName);
};

export const selectWorkingGroupId = (state: RootState) =>
	selectGroupsState(state).workingGroupId;
export const selectWorkingGroup = (state: RootState) => {
	const { workingGroupId, entities } = selectGroupsState(state);
	return (workingGroupId && entities[workingGroupId]) || undefined;
};
export const selectWorkingGroupName = (state: RootState) =>
	selectWorkingGroup(state)?.name || "";

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
					if (g.parent_id === workingGroupId) return true; // id is descendent of workingGroupId
					g = g.parent_id ? entities[g.parent_id] : undefined;
				} while (g);
				return false; // id is not an descendent of workingGroupId
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
	selectWorkingGroupId,
	(entities, workingGroupId) => {
		const groups: Group[] = [];
		while (workingGroupId) {
			const group = entities[workingGroupId];
			if (group) {
				groups.unshift(group);
				workingGroupId = group.parent_id;
			} else {
				workingGroupId = null;
			}
		}
		return groups;
	}
);

export const groupsSelectors = getAppTableDataSelectors(selectGroupsState);

/* Thunk actions */
const baseUrl = "/api/groups";

function validResponse(response: any): response is Group[] {
	return Array.isArray(response) && response.every(validGroup);
}

export const loadGroups =
	(groupName?: string): AppThunk =>
	(dispatch) => {
		dispatch(getPending());
		const url = groupName ? `${baseUrl}/${groupName}` : baseUrl;
		return fetcher
			.get(url, groupName ? undefined : { type: ["c", "wg"] })
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess2(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get groups", error));
			});
	};
