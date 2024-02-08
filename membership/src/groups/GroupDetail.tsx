import * as React from "react";

import {
	ConfirmModal,
	deepDiff,
	deepMergeTagMultiple,
	Multiple,
	ActionButton,
	setError,
	shallowDiff,
} from "dot11-components";

import { AccessLevel } from "../store/user";
import {
	addGroup,
	updateGroups,
	deleteGroups,
	selectGroupsState,
	selectUserGroupsAccess,
	selectWorkingGroupId,
	setSelected,
	Group,
	GroupCreate,
	GroupUpdate,
} from "../store/groups";
import {
	addOfficers,
	updateOfficers,
	deleteOfficers,
	selectOfficersState,
	getGroupOfficers,
	OfficerId,
	Officer,
	OfficerUpdate,
	OfficerCreate,
} from "../store/officers";

import ShowAccess from "../components/ShowAccess";
import GroupEntryEdit from "./GroupEntry";
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

export type GroupEntry = GroupCreate & { officers: Officer[] };
export type MultipleGroupEntry = Multiple<GroupCreate> & {
	officers: Officer[];
};

function deepEqual(obj1: any, obj2: any): boolean {
	if (obj1 === obj2) return true;

	if (Array.isArray(obj1) && Array.isArray(obj2)) {
		if (obj1.length !== obj2.length) return false;
		for (let i = 0; i < obj1.length; i++) {
			if (!deepEqual(obj1[i], obj2[i])) return false;
		}
		return true;
	}

	if (obj1 !== Object(obj1) || obj2 !== Object(obj2)) return obj1 === obj2;

	if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;
	for (let key in obj1) {
		if (!(key in obj2)) return false;
		if (!deepEqual(obj1[key], obj2[key])) return false;
	}

	return true;
}

function GroupDetail() {
	const dispatch = useAppDispatch();
	const access = useAppSelector(selectUserGroupsAccess);
	const readOnly = access <= AccessLevel.ro;
	const { entities, selected, loading } =
		useAppSelector(selectGroupsState);
	const { entities: officerEntities, ids: officerIds } =
		useAppSelector(selectOfficersState);
	const groupId = useAppSelector(selectWorkingGroupId);

	const groups = React.useMemo(
		() => selected.map((id) => entities[id]!).filter((b) => Boolean(b)),
		[selected, entities]
	);

	const [edited, setEdited] = React.useState<MultipleGroupEntry | null>(null);
	const [saved, setSaved] = React.useState<MultipleGroupEntry | null>(null);
	const [editedGroups, setEditedGroups] = React.useState<Group[]>([]);
	const [action, setAction] = React.useState<"update" | "add">("update");
	const [busy, setBusy] = React.useState(false);

	const initState = React.useCallback(() => {
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

		setAction("update");
		setEdited(edited);
		setSaved(edited);
		setEditedGroups(groups);
	}, [groups, officerIds, officerEntities, setEdited, setSaved, setEditedGroups]);

	React.useEffect(() => {
		const changeWithConfirmation = async () => {
			if (edited !== saved) {
				const ok = await ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				);
				if (!ok) {
					const ids = editedGroups.map(group => group.id);
					dispatch(setSelected(ids));
					return;
				}
			}
			initState();
		};
		if (selected.join() !== editedGroups.map((g) => g.id).join())
			changeWithConfirmation();
	}, [selected, editedGroups, edited, saved, initState, dispatch]);

	const changeEntry = (changes: Partial<GroupEntry>) => {
		if (readOnly) {
			console.warn("Update with insufficient access");
			return;
		}
		const newEdited = { ...edited!, ...changes };
		if (deepEqual(newEdited, saved)) {
			setEdited(saved);
		} else {
			setEdited(newEdited);
		}
	};

	const add = async () => {
		if (readOnly) {
			console.warn("Insufficient access for add entry");
			return;
		}
		let { officers, ...newGroup } = edited as GroupEntry;
		for (const group of Object.values(entities)) {
			if (group!.parent_id === groupId && group!.name === newGroup.name) {
				setError(
					"Unable to add entry",
					"Entry already exists for " + (group!.name || BLANK_STR)
				);
				return;
			}
		}
		setBusy(true);
		const group = await dispatch(addGroup(newGroup));
		if (group) {
			if (officers.length) {
				officers = officers.map((o) => ({ ...o, group_id: group.id }));
				await dispatch(addOfficers(officers));
			}
			setSelected([group.id]);
		}
		initState();
		setBusy(false);
	};

	const update = async () => {
		if (readOnly) {
			console.warn("Insufficient access for update entry");
			return;
		}
		setBusy(true);

		const { officers: savedOfficers, ...savedEntry } = saved!;
		const { officers: editedOfficers, ...editedEntry } = edited!;

		const edits = shallowDiff(editedEntry, savedEntry);
		const updates: GroupUpdate[] = [];
		for (const group of editedGroups) {
			const changes = shallowDiff({ ...group, ...edits }, group);
			if (Object.keys(changes).length > 0) {
				updates.push({ id: group.id, changes });
			}
		}
		if (updates.length > 0)
			await dispatch(updateGroups(updates));

		if (editedGroups.length === 1) {
			const officerAdds: OfficerCreate[] = [],
				officerUpdates: OfficerUpdate[] = [],
				officerDeletes: OfficerId[] = [];

			for (const o1 of editedOfficers) {
				const o2 = officerEntities[o1.id];
				if (o2) {
					const changes = deepDiff(o2, o1) || {};
					if (Object.keys(changes).length > 0)
						officerUpdates.push({ id: o2.id, changes });
				} else {
					officerAdds.push(o1);
				}
			}
			for (const o2 of savedOfficers) {
				if (!editedOfficers.find((o) => o.id === o2.id))
					officerDeletes.push(o2.id);
			}
			if (officerAdds.length > 0)
				await dispatch(addOfficers(officerAdds));
			if (officerUpdates.length > 0)
				await dispatch(updateOfficers(officerUpdates));
			if (officerDeletes.length > 0)
				await dispatch(deleteOfficers(officerDeletes));
		}

		setSaved(edited)
		setBusy(false);
	};

	const cancel = async () => {
		initState();
	};

	const clickAdd = () => {
		dispatch(setSelected([]));
		const entry: GroupEntry = {
			...defaultEntry,
			parent_id: groupId,
		};
		setAction("add");
		setEdited(entry);
		setEditedGroups([]);
	};

	const clickDelete = async () => {
		if (access <= AccessLevel.ro) {
			console.warn("Insufficient access to delete entry");
			return;
		}
		const groupNames = groups.map((group) => group.name || BLANK_STR);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${groupNames.join(", ")}?`
		);
		if (!ok) return;
		await dispatch(deleteGroups(groups.map((group) => group.id)));
	};

	let placeholder = "";
	if (loading) placeholder = "Loading...";
	else if (action === "update" && !edited)
		placeholder = "Nothing selected";

	let title = "",
		submit: (() => void) | undefined;
	if (action === "add") {
		title = "Add group";
		submit = add;
	} else if (action === "update" && edited !== saved) {
		title = "Update group";
		if (edited !== saved)
			submit = update;
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
						onClick={clickAdd}
					/>
					<ActionButton
						name="delete"
						title="Delete group"
						disabled={loading || groups.length === 0 || readOnly}
						onClick={clickDelete}
					/>
				</div>
			</div>
			{placeholder ? (
				<div className="placeholder">{placeholder}</div>
			) : (
				<GroupEntryEdit
					action={action}
					//title={title}
					entry={edited!}
					changeEntry={changeEntry}
					submit={submit}
					cancel={submit? cancel: undefined}
					busy={busy}
					readOnly={readOnly}
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}

export default GroupDetail;
