import * as React from "react";
import { shallowEqual } from "react-redux";

import {
	ConfirmModal,
	deepMergeTagMultiple,
	Multiple,
	ActionButton,
	setError,
} from "dot11-components";

import { AccessLevel } from "../store/user";
import {
	selectGroupsState,
	selectUserGroupsAccess,
	selectWorkingGroupId,
	setSelected,
	Group,
	GroupCreate,
	getSubgroupTypes,
} from "../store/groups";
import {
	selectOfficerEntities,
	selectOfficerIds,
	getGroupOfficers,
	Officer,
} from "../store/officers";

import ShowAccess from "../components/ShowAccess";
import {
	GroupEntryForm,
	useGroupAdd,
	useGroupsDelete,
	useGroupsUpdate,
	GroupEntry,
	MultipleGroupEntry,
	EditAction,
} from "./GroupEntry";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const BLANK_STR = "(Blank)";

const defaultEntry: GroupEntry = {
	parent_id: null,
	name: "",
	type: "tg",
	status: 1,
	color: "white",
	symbol: null,
	project: null,
	officerSAPINs: [],
	officers: [],
};

type GroupDetailState = {
	action: EditAction;
	edited: MultipleGroupEntry | null;
	saved: MultipleGroupEntry | null;
	groups: Group[];
};

function GroupDetail() {
	const dispatch = useAppDispatch();

	const access = useAppSelector(selectUserGroupsAccess);
	const readOnly = access <= AccessLevel.ro;

	const { entities, selected, loading, valid } =
		useAppSelector(selectGroupsState);
	const officerEntities = useAppSelector(selectOfficerEntities);
	const officerIds = useAppSelector(selectOfficerIds);
	const groupId = useAppSelector(selectWorkingGroupId);

	const initState = React.useCallback((): GroupDetailState => {
		const groups = selected
			.map((id) => entities[id]!)
			.filter((g) => Boolean(g));

		let diff: Multiple<GroupCreate> | null = null;
		for (const group of groups) {
			diff = deepMergeTagMultiple(diff || {}, group);
		}

		// If editing a single group, get officer list
		let officers: Officer[] =
			groups.length === 1
				? getGroupOfficers(officerIds, officerEntities, groups[0].id)
				: [];

		let edited = diff ? { ...diff, officers } : null;

		return {
			action: "view",
			edited,
			saved: edited,
			groups,
		};
	}, [selected, entities, officerIds, officerEntities]);

	const uRef = React.useRef<typeof initState>();
	uRef.current = initState;

	const [state, setState] = React.useState(initState);
	const [busy, setBusy] = React.useState(false);

	React.useEffect(() => {
		const ids = state.groups.map((g) => g.id);
		if (state.action === "view" && selected.join() !== ids.join()) {
			setState(initState);
		} else if (
			state.action === "update" &&
			selected.join() !== ids.join()
		) {
			ConfirmModal.show(
				"Changes not applied! Do you want to discard changes?"
			).then((ok) => {
				if (ok) setState(initState);
				else dispatch(setSelected(ids));
			});
		} else if (state.action === "add" && selected.length > 0) {
			if (state.edited !== state.saved) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) setState(initState);
					else dispatch(setSelected([]));
				});
			} else {
				setState(initState);
			}
		}
	}, [state, selected, initState, dispatch]);

	const changeEntry = (changes: Partial<GroupEntry>) => {
		if (readOnly || state.edited === null || state.saved === null) {
			console.warn("Update with insufficient access");
			return;
		}
		setState((state) => {
			let { action, edited, saved } = state;
			edited = { ...edited!, ...changes };
			if (shallowEqual(edited, saved!)) {
				if (action !== "add") action = "view";
				edited = saved!;
			} else {
				if (action !== "add") action = "update";
			}
			return {
				...state,
				action,
				edited,
				saved,
			};
		});
	};

	const groupAdd = useGroupAdd();

	const add = async () => {
		if (readOnly || state.edited === null) {
			console.warn("Add with unexpected state");
			return;
		}
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
						"Entry already exists for " + (group.name || BLANK_STR)
					)
				);
				return;
			}
		}
		setState((state) => ({
			...state,
			saved: state.edited,
		}));
		setBusy(true);
		const group = await groupAdd(edited);
		setBusy(false);
		dispatch(setSelected(group ? [group.id] : []));
	};

	const groupsUpdate = useGroupsUpdate();

	const update = async () => {
		if (readOnly || state.edited === null || state.saved === null) {
			console.warn("Update with unexpected state");
			return;
		}
		const { edited, saved, groups } = state;
		setBusy(true);
		await groupsUpdate(edited, saved, groups);
		setBusy(false);
		setState((state) => ({
			...state,
			action: "view",
			saved: edited,
		}));
	};

	const cancel = async () => {
		setState(initState);
	};

	const clickAdd = async () => {
		if (state.action === "update") {
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
			saved: entry,
			groups: [],
		});
	};

	const groupsDelete = useGroupsDelete();

	const clickDelete = async () => {
		if (readOnly || state.groups.length === 0) {
			console.warn("Delete with unexpected state");
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
	};

	let placeholder = "";
	if (loading && !valid) placeholder = "Loading...";
	else if (state.action !== "add" && state.groups.length === 0)
		placeholder = "Nothing selected";

	let title = "",
		submit: (() => void) | undefined;
	if (state.action === "add") {
		title = "Add group";
		submit = add;
	} else if (state.action === "update") {
		title = "Update group";
		submit = update;
	} else {
		title = "Group detail";
	}

	return (
		<>
			<div className="top-row">
				<h3 style={{ color: "#0099cc", margin: 0 }}>{title}</h3>
				<div>
					<ActionButton
						name="add"
						title="Add group"
						disabled={loading || readOnly}
						isActive={state.action === "add"}
						onClick={clickAdd}
					/>
					<ActionButton
						name="delete"
						title="Delete group"
						disabled={
							loading || state.groups.length === 0 || readOnly
						}
						onClick={clickDelete}
					/>
				</div>
			</div>
			{placeholder ? (
				<div className="placeholder">{placeholder}</div>
			) : (
				<GroupEntryForm
					action={state.action}
					entry={state.edited!}
					changeEntry={changeEntry}
					submit={submit}
					cancel={submit ? cancel : undefined}
					busy={busy}
					readOnly={readOnly}
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}

export default GroupDetail;
