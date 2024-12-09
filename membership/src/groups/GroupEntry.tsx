import * as React from "react";
import {
	isMultiple,
	Form,
	Row,
	Field,
	Input,
	Select,
	shallowDiff,
	Multiple,
} from "dot11-components";

import { useAppSelector, useAppDispatch } from "../store/hooks";
import {
	addGroup,
	updateGroups,
	deleteGroups,
	selectGroup,
	getSubgroupTypes,
	GroupTypeLabels,
	GroupTypeOptions,
	GroupStatusOptions,
	GroupType,
	Group,
	GroupCreate,
	GroupUpdate,
	selectGroupEntities,
} from "../store/groups";
import {
	addOfficers,
	updateOfficers,
	deleteOfficers,
	OfficerCreate,
	OfficerUpdate,
	OfficerId,
	Officer,
} from "../store/officers";

import Officers from "./Officers";
import GroupSelector from "../components/GroupSelector";
import ImatCommitteeSelector from "./ImatCommitteeSelector";
import ColorPicker from "../components/ColorPicker";

export type GroupEntry = GroupCreate & { officers: Officer[] };
export type MultipleGroupEntry = Multiple<GroupCreate> & {
	officers: Officer[];
};

export type EditAction = "view" | "update" | "add";

const MULTIPLE_STR = "(Multiple)";
const BLANK_STR = "(Blank)";

function GroupTypeSelector({
	value,
	onChange,
	parent_id,
	...otherProps
}: {
	value: GroupType | null;
	onChange: (value: GroupType | null) => void;
	parent_id: string | null;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	const parentGroup = useAppSelector((state) =>
		parent_id ? selectGroup(state, parent_id) : undefined
	);

	let options = parentGroup
		? getSubgroupTypes(parentGroup.type!).map((type) => ({
				value: type,
				label: GroupTypeLabels[type],
		  }))
		: [];

	function handleChange(values: typeof options) {
		const newValue: GroupType | null =
			values.length > 0 ? values[0].value : null;
		if (newValue !== value) onChange(newValue);
	}

	const values = GroupTypeOptions.filter((o) => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}

function GroupStatusSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number;
	onChange: (value: number) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
>) {
	function handleChange(values: typeof GroupStatusOptions) {
		const newValue = values.length > 0 ? values[0].value : 0;
		if (newValue !== value) onChange(newValue);
	}

	const values = GroupStatusOptions.filter((o) => o.value === value);

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={GroupStatusOptions}
			portal={document.querySelector("#root")}
			{...otherProps}
		/>
	);
}

function checkEntry(entry: MultipleGroupEntry): string | undefined {
	if (!entry.name) return "Set group name";
	if (!entry.parent_id && entry.type !== "r") return "Set group parent";
	if (!entry.type) return "Set group type";
	for (const officer of entry.officers) {
		if (!officer.position) return "Set officer position";
		if (!officer.sapin) return "Select member for officer position";
	}
}

export function GroupEntryForm({
	action,
	entry,
	changeEntry,
	busy,
	submit,
	cancel,
	readOnly,
}: {
	action: EditAction;
	entry: MultipleGroupEntry;
	changeEntry: (changes: Partial<GroupEntry>) => void;
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	const entities = useAppSelector(selectGroupEntities);

	function change(changes: Partial<GroupEntry>) {
		if ("symbol" in changes && entry.type === "tg") {
			const s = changes.symbol?.split("/");
			changes.project = "P" + (s ? s[s.length - 1] : s);
		}
		if ("parent_id" in changes) {
			const { parent_id } = changes;
			const parentGroup = parent_id ? entities[parent_id] : undefined;
			if (parentGroup) {
				const types = getSubgroupTypes(parentGroup.type!);
				if (
					parentGroup.type !== entry.type &&
					(isMultiple(entry.type) || !types.includes(entry.type!))
				) {
					changes.type = types[0] || null;
				}
			} else {
				changes.type = null;
			}
		}
		changeEntry(changes);
	}

	return (
		<Form
			className="main"
			busy={busy}
			submitLabel={action === "add" ? "Add" : "Update"}
			submit={submit}
			cancel={cancel}
			errorText={checkEntry(entry)}
		>
			<Row>
				<Field label="Parent group:">
					<GroupSelector
						style={{ width: 200 }}
						value={
							isMultiple(entry.parent_id)
								? ""
								: entry.parent_id || ""
						}
						onChange={(parent_id) => change({ parent_id })}
						placeholder={
							isMultiple(entry.parent_id)
								? MULTIPLE_STR
								: "(None)"
						}
						readOnly={readOnly || entry.type === "r"}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Group name:">
					<Input
						type="text"
						value={isMultiple(entry.name) ? "" : entry.name || ""}
						onChange={(e) => change({ name: e.target.value })}
						placeholder={
							isMultiple(entry.name) ? MULTIPLE_STR : BLANK_STR
						}
						disabled={readOnly || entry.type === "r"}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Group type:">
					<GroupTypeSelector
						style={{ width: 200 }}
						value={isMultiple(entry.type) ? null : entry.type}
						onChange={(type) => change({ type })}
						parent_id={entry.parent_id}
						placeholder={
							isMultiple(entry.type) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly || entry.type === "r"}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Status:">
					<GroupStatusSelector
						value={isMultiple(entry.status) ? 1 : entry.status || 0}
						onChange={(status) => change({ status })}
						placeholder={
							isMultiple(entry.status) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly || entry.type === "r"}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Color:">
					<ColorPicker
						value={isMultiple(entry.color) ? "" : entry.color || ""}
						onChange={(value) => change({ color: value })}
						readOnly={readOnly || entry.type === "r"}
					/>
				</Field>
			</Row>
			{entry.type === "tg" && (
				<Row>
					<Field label="Project:">
						<Input
							type="text"
							value={
								isMultiple(entry.project)
									? ""
									: entry.project || ""
							}
							onChange={(e) =>
								change({ project: e.target.value })
							}
							placeholder={
								isMultiple(entry.project)
									? MULTIPLE_STR
									: BLANK_STR
							}
							disabled={readOnly}
						/>
					</Field>
				</Row>
			)}
			{entry.type && ["c", "wg", "tg"].includes(entry.type) && (
				<Row>
					<Field label={"IMAT committee:"}>
						<ImatCommitteeSelector
							value={
								isMultiple(entry.symbol)
									? ""
									: entry.symbol || ""
							}
							onChange={(symbol) => change({ symbol })}
							type={
								entry.type === "wg"
									? "Working Group"
									: entry.type === "tg"
									? "Project"
									: undefined
							}
							placeholder={
								isMultiple(entry.symbol)
									? MULTIPLE_STR
									: undefined
							}
							readOnly={readOnly}
						/>
					</Field>
				</Row>
			)}
			{!isMultiple(entry.id) && (
				<Row>
					<Officers
						group={entry as GroupCreate}
						readOnly={readOnly}
						officers={entry.officers}
						onChange={(officers) => change({ officers })}
					/>
				</Row>
			)}
		</Form>
	);
}

export function useGroupsUpdate() {
	const dispatch = useAppDispatch();

	return async (
		edited: MultipleGroupEntry,
		saved: MultipleGroupEntry,
		groups: Group[]
	) => {
		const { officers: savedOfficers, ...savedEntry } = saved;
		const { officers: editedOfficers, ...editedEntry } = edited;

		const edits = shallowDiff(savedEntry, editedEntry);
		const updates: GroupUpdate[] = [];
		for (const group of groups) {
			const changes = shallowDiff(group, {
				...group,
				...edits,
			}) as Partial<Group>;
			if (Object.keys(changes).length > 0) {
				updates.push({ id: group.id, changes });
			}
		}
		if (updates.length > 0) await dispatch(updateGroups(updates));

		if (groups.length === 1) {
			const officerAdds: OfficerCreate[] = [],
				officerUpdates: OfficerUpdate[] = [],
				officerDeletes: OfficerId[] = [];

			for (const o1 of editedOfficers) {
				const o2 = savedOfficers.find((o) => o.id === o1.id);
				if (o2) {
					const changes = shallowDiff(o2, o1);
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
	};
}

export function useGroupAdd() {
	const dispatch = useAppDispatch();
	return async (edited: MultipleGroupEntry) => {
		let { officers, ...newGroup } = edited;
		const group = await dispatch(addGroup(newGroup as GroupCreate));
		if (group) {
			if (officers.length) {
				officers = officers.map((o) => ({ ...o, group_id: group.id }));
				await dispatch(addOfficers(officers));
			}
		}
		return group;
	};
}

export function useGroupsDelete() {
	const dispatch = useAppDispatch();
	return async (groups: Group[]) => {
		await dispatch(deleteGroups(groups.map((g) => g.id)));
		return;
	};
}
