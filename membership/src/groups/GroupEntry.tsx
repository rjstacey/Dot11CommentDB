import React from "react";
import { isMultiple, Form, Row, Field, Input, Select } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import {
	selectGroup,
	GroupTypeOptions,
	GroupStatusOptions,
	type GroupType,
} from "../store/groups";

import Officers from "./Officers";
import GroupSelector from "../components/GroupSelector";
import ImatCommitteeSelector from "../components/ImatCommitteeSelector";
import ColorPicker from "../components/ColorPicker";
import type { MultipleGroupEntry, GroupEntry } from "./GroupDetail";

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

	let options = GroupTypeOptions;
	if (!parentGroup)
		options = options.filter((o) => ["c", "wg"].includes(o.value));
	else if (parentGroup.type === "c")
		options = options.filter((o) => o.value === "wg");
	else if (parentGroup.type === "wg")
		options = options.filter((o) => o.value !== "c");
	else options = options.filter((o) => !["c", "wg"].includes(o.value));

	function handleChange(values: typeof GroupTypeOptions) {
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
	if (!entry.parent_id) return "Set group parent";
	if (!entry.type) return "Set group type";
	for (const officer of entry.officers) {
		if (!officer.position) return "Set officer position";
		if (!officer.sapin) return "Select member for officer position";
	}
}

function GroupEntryForm({
	action,
	entry,
	changeEntry,
	title,
	busy,
	submit,
	cancel,
	readOnly,
}: {
	action: "add" | "update";
	entry: MultipleGroupEntry;
	changeEntry: (changes: Partial<GroupEntry>) => void;
	title?: string;
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	function change(changes: Partial<GroupEntry>) {
		if ("symbol" in changes && entry.type === "tg") {
			const s = changes.symbol?.split("/");
			changes.project = "P" + (s ? s[s.length - 1] : s);
		}
		changeEntry(changes);
	}

	return (
		<Form
			title={title}
			busy={busy}
			submitLabel={action === "add" ? "Add" : "Update"}
			submit={submit}
			cancel={cancel}
			errorText={checkEntry(entry)}
		>
			<Row>
				<Field label="Group name:">
					<Input
						type="text"
						value={isMultiple(entry.name) ? "" : entry.name || ""}
						onChange={(e) => change({ name: e.target.value })}
						placeholder={
							isMultiple(entry.name) ? MULTIPLE_STR : BLANK_STR
						}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Color:">
					<ColorPicker
						value={isMultiple(entry.color) ? "" : entry.color}
						onChange={(color) => change({ color })}
						readOnly={readOnly}
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
						readOnly={readOnly}
					/>
				</Field>
			</Row>
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
						readOnly={readOnly}
					/>
				</Field>
			</Row>

			<Row>
				<Field label="Status:">
					<GroupStatusSelector
						value={isMultiple(entry.status) ? 1 : entry.status}
						onChange={(status) => change({ status })}
						placeholder={
							isMultiple(entry.status) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly}
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
							value={isMultiple(entry.symbol) ? "" : entry.symbol}
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
			{entry.id && !isMultiple(entry.id) && (
				<Row>
					<Officers
						groupId={entry.id}
						readOnly={readOnly}
						officers={entry.officers}
						onChange={(officers) => change({ officers })}
					/>
				</Row>
			)}
		</Form>
	);
}

export default GroupEntryForm;
