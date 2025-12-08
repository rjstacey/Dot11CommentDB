import * as React from "react";
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
} from "@/edit/groupActions";
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

export function useGroupsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();

	const { entities, selected, loading, valid } =
		useAppSelector(selectGroupsState);
	const officerEntities = useAppSelector(selectOfficerEntities);
	const officerIds = useAppSelector(selectOfficerIds);
	const groupId = useAppSelector(selectTopLevelGroupId);

	const initState = React.useCallback((): GroupsEditState => {
		const groups = selected.map((id) => entities[id]!).filter(Boolean);

		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
			} satisfies GroupsEditState;
		} else if (groups.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
			} satisfies GroupsEditState;
		} else {
			let edited = {} as MultipleGroupEntry;
			for (const group of groups) {
				edited = deepMergeTagMultiple(
					edited,
					group
				) as MultipleGroupEntry;
			}

			// If editing a single group, get officer list
			const officers: Officer[] =
				groups.length === 1
					? getGroupOfficers(
							officerIds,
							officerEntities,
							groups[0].id
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
	}, [selected, entities, officerIds, officerEntities]);

	const [state, setState] = React.useState(initState);

	React.useEffect(() => {
		if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) setState(initState);
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			const ids = state.groups.map((g) => g.id);
			if (selected.join() !== ids.join()) {
				if (state.edited === state.saved) {
					setState(initState);
					return;
				}
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) setState(initState);
					else dispatch(setSelected(ids));
				});
			}
		} else if (selected.length > 0) {
			setState(initState);
		}
	}, [state, selected, initState]);

	const hasChanges = React.useCallback(() => {
		return (
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved)
		);
	}, [state]);

	const onChange = React.useCallback(
		(changes: Partial<GroupEntry>) => {
			setState((state) => {
				if (readOnly || state.action === null) {
					console.warn("onChange: bad state");
					return state;
				}
				if (state.action === "add") {
					const edited = { ...state.edited, ...changes };
					return { ...state, edited } satisfies GroupsEditState;
				} else {
					let edited = { ...state.edited, ...changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return { ...state, edited };
				}
			});
		},
		[readOnly, setState]
	);

	const groupAdd = useGroupAdd();
	const groupsUpdate = useGroupsUpdate();

	const submit = React.useCallback(async () => {
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
								(group.name || BLANK_STR)
						)
					);
					return;
				}
			}
			setState({
				action: null,
				message: "Adding...",
			});
			const group = await groupAdd(edited);
			dispatch(setSelected(group ? [group.id] : []));
		} else if (state.action === "update") {
			const { edited, saved, groups } = state;
			setState({
				...state,
				saved: edited,
			});
			await groupsUpdate(edited, saved, groups);
		}
	}, [readOnly, state]);

	const cancel = async () => {
		setState(initState);
	};

	const disableAdd = readOnly || loading;
	const onAdd = React.useCallback(async () => {
		if (state.action === "update" && state.edited !== state.saved) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}
		dispatch(setSelected([]));
		const parentGroup = groupId ? entities[groupId] : undefined;
		const entry: GroupEntry = {
			...defaultEntry,
			type:
				(parentGroup && getSubgroupTypes(parentGroup.type!)[0]) || null,
			parent_id: groupId,
		};
		setState({
			action: "add",
			edited: entry,
			saved: undefined,
		});
	}, [state, dispatch, setState]);

	const groupsDelete = useGroupsDelete();

	const disableDelete = readOnly || loading || state.action !== "update";
	const onDelete = React.useCallback(async () => {
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
						"Our whole world would collapse"
					)
				);
				return;
			}
			const str =
				"Are you sure you want to delete:\n" +
				groups.map((g) => g.name || BLANK_STR).join("\n");
			const ok = await ConfirmModal.show(str);
			if (ok) {
				await groupsDelete(groups);
				setSelected([]);
			}
		}
	}, [disableDelete, state, dispatch, groupsDelete, setSelected]);

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
