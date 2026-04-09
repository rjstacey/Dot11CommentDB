import { useCallback, useEffect, useReducer } from "react";
import isEqual from "lodash.isequal";

import { ConfirmModal, deepMergeTagMultiple } from "@common";

import { setError } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectGroupsState,
	selectTopLevelGroupId,
	setSelected,
	Group,
	getSubgroupTypes,
} from "@/store/groups";
import {
	selectOfficerEntities,
	selectOfficerIds,
	getGroupOfficers,
	Officer,
} from "@/store/officers";
import {
	useGroupAdd,
	useGroupsDelete,
	useGroupsUpdate,
} from "@/hooks/groupActions";
import { BLANK_STR } from "@/components/constants";

import { GroupEntry, MultipleGroupEntry } from "./groupActions";
export type { GroupEntry, MultipleGroupEntry };

const defaultEntry: GroupEntry = {
	parent_id: null,
	name: "",
	type: "tg",
	status: 1,
	color: "white",
	symbol: null,
	project: null,
	officers: [],
};

type GroupsEditState =
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add";
			edited: GroupEntry;
			saved: undefined;
	  }
	| {
			action: "update";
			edited: MultipleGroupEntry;
			saved: MultipleGroupEntry;
			groups: Group[];
	  };

type GroupsEditAction =
	| {
			type: "INIT";
	  }
	| {
			type: "ADD";
	  }
	| {
			type: "UPDATE";
			changes: Partial<GroupEntry>;
	  }
	| {
			type: "SUBMIT";
	  };

function useGroupsEditReducer({
	groupId,
	selected,
	entities,
	loading,
	valid,
}: {
	groupId: string | null;
	selected: string[];
	entities: Record<string, Group>;
	loading: boolean;
	valid: boolean;
}) {
	const officerEntities = useAppSelector(selectOfficerEntities);
	const officerIds = useAppSelector(selectOfficerIds);

	const init = useCallback((): GroupsEditState => {
		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
			} satisfies GroupsEditState;
		}
		const groups = selected.map((id) => entities[id]!).filter(Boolean);
		if (groups.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
			} satisfies GroupsEditState;
		} else {
			let edited = {} as MultipleGroupEntry;
			for (const group of groups) {
				edited = deepMergeTagMultiple(
					edited,
					group,
				) as MultipleGroupEntry;
			}

			// If editing a single group, get officer list
			const officers: Officer[] =
				groups.length === 1
					? getGroupOfficers(
							officerIds,
							officerEntities,
							groups[0].id,
						)
					: [];

			edited = { ...edited, officers };

			return {
				action: "update",
				edited,
				saved: edited,
				groups,
			};
		}
	}, [selected, entities, loading, valid, officerIds, officerEntities]);

	const reducer = useCallback(
		(state: GroupsEditState, action: GroupsEditAction): GroupsEditState => {
			if (action.type === "INIT") {
				return init();
			}
			if (action.type === "ADD") {
				const parentGroup = groupId ? entities[groupId] : undefined;
				const entry: GroupEntry = {
					...defaultEntry,
					type:
						(parentGroup &&
							getSubgroupTypes(parentGroup.type!)[0]) ||
						null,
					parent_id: groupId,
				};
				return {
					action: "add",
					edited: entry,
					saved: undefined,
				};
			}
			if (action.type === "UPDATE") {
				if (state.action === "add") {
					return {
						...state,
						edited: { ...state.edited, ...action.changes },
					};
				} else if (state.action === "update") {
					let edited = { ...state.edited, ...action.changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return {
						...state,
						edited,
					};
				}
				return state;
			}
			if (action.type === "SUBMIT") {
				if (state.action === "add") {
					return {
						...state,
						action: null,
						message: "Adding...",
					};
				} else if (state.action === "update") {
					return {
						...state,
						saved: state.edited,
					};
				}
				return state;
			}
			console.error("Unknown action:", action);
			return state;
		},
		[init, groupId, entities],
	);

	return useReducer(reducer, undefined, init);
}

export function useGroupsEdit(readOnly: boolean) {
	const groupId = useAppSelector(selectTopLevelGroupId);
	const { selected, entities, loading, valid } =
		useAppSelector(selectGroupsState);
	const [state, dispatchStateAction] = useGroupsEditReducer({
		groupId,
		selected,
		entities,
		loading,
		valid,
	});
	const dispatch = useAppDispatch();

	useEffect(() => {
		if (state.action === null) {
			dispatchStateAction({ type: "INIT" });
		} else if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction({ type: "INIT" });
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				dispatchStateAction({ type: "INIT" });
				return;
			}
			const ids = state.groups.map((g) => g.id);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction({ type: "INIT" });
					else dispatch(setSelected(ids));
				});
			}
		}
	}, [selected]);

	const hasChanges = useCallback(() => {
		return (
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved)
		);
	}, [state]);

	const onChange = useCallback(
		(changes: Partial<GroupEntry>) => {
			if (readOnly || state.action === null) {
				console.warn("onChange: bad state");
				return;
			}
			dispatchStateAction({ type: "UPDATE", changes });
		},
		[readOnly, state.action],
	);

	const groupAdd = useGroupAdd();
	const groupsUpdate = useGroupsUpdate();

	const submit = useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "add") {
			const { edited } = state;
			for (const group of Object.values(entities)) {
				if (
					group &&
					group.parent_id === groupId &&
					group.name === edited.name
				) {
					dispatch(
						setError(
							"Unable to add group",
							"Entry already exists for " +
								(group.name || BLANK_STR),
						),
					);
					return;
				}
			}
			const group = await groupAdd(edited);
			dispatch(setSelected(group ? [group.id] : []));
		} else if (state.action === "update") {
			const { edited, saved, groups } = state;
			await groupsUpdate(edited, saved, groups);
		}
		dispatchStateAction({ type: "SUBMIT" });
	}, [readOnly, state, groupId, entities]);

	const cancel = useCallback(async () => {
		dispatchStateAction({ type: "INIT" });
	}, []);

	const disableAdd = readOnly || loading;
	const onAdd = useCallback(async () => {
		if (disableAdd) {
			console.warn("onAdd: bad state");
			return;
		}
		if (hasChanges()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`,
			);
			if (!ok) return;
		}
		dispatch(setSelected([]));
		dispatchStateAction({ type: "ADD" });
	}, [disableAdd, hasChanges]);

	const groupsDelete = useGroupsDelete();

	const disableDelete = readOnly || state.action !== "update";
	const onDelete = useCallback(async () => {
		if (disableDelete) {
			console.warn("onDelete: bad state");
			return;
		}
		const { groups } = state;
		if (groups.length > 0) {
			const rootGroup = groups.find((g) => g.type === "r");
			if (rootGroup) {
				dispatch(
					setError(
						`Can't delete ${rootGroup.name}!`,
						"Our whole world would collapse",
					),
				);
				return;
			}
			const str =
				"Are you sure you want to delete:\n" +
				groups.map((g) => g.name || BLANK_STR).join("\n");
			const ok = await ConfirmModal.show(str);
			if (ok) {
				await groupsDelete(groups);
				dispatchStateAction({ type: "SUBMIT" });
				dispatch(setSelected([]));
			}
		}
	}, [disableDelete, state, groupsDelete]);

	return {
		state,
		hasChanges,
		onChange,
		submit,
		cancel,
		onAdd,
		disableAdd,
		onDelete,
		disableDelete,
	};
}
