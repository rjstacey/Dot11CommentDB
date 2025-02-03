import React from "react";
import { DateTime } from "luxon";

import {
	Row,
	Field,
	Input,
	Checkbox,
	ActionIcon,
	Dropdown,
	isMultiple,
} from "dot11-components";

import type { Member, StatusChangeEntry, StatusType } from "@/store/members";

import { EditTable as Table } from "@/components/Table";

import StatusSelector from "./StatusSelector";
import type { MultipleMember } from "./MemberEdit";
import { hasChangesStyle } from "./utils";

const MULTIPLE_STR = "(Multiple)";
const BLANK_STR = "(Blank)";

const displayDate = (isoDateTime: string) =>
	DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function MemberStatusChangeForm({
	entry,
	onChange,
}: {
	entry: StatusChangeEntry;
	onChange: (entry: StatusChangeEntry) => void;
	close: () => void;
}) {
	function change(changes: Partial<StatusChangeEntry>) {
		onChange({ ...entry, ...changes });
	}

	const date = entry.Date?.substring(0, 10);

	return (
		<>
			<Row>
				<Field label="Date:">
					<input
						type="date"
						value={date}
						onChange={(e) => change({ Date: e.target.value })}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Old status:">
					<StatusSelector
						value={entry.OldStatus}
						onChange={(value) => change({ OldStatus: value })}
						placeholder={BLANK_STR}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="New status:">
					<StatusSelector
						value={entry.NewStatus}
						onChange={(value) => change({ NewStatus: value })}
						placeholder={BLANK_STR}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Reason:">
					<Input
						type="text"
						value={entry.Reason}
						onChange={(e) => change({ Reason: e.target.value })}
						placeholder={BLANK_STR}
					/>
				</Field>
			</Row>
		</>
	);
}

export function MemberStatusChangeDropdown({
	entry,
	onChange,
	readOnly,
}: {
	entry: StatusChangeEntry;
	onChange: (entry: StatusChangeEntry) => void;
	readOnly?: boolean;
}) {
	return (
		<Dropdown
			handle={false}
			selectRenderer={({ state, methods }) => (
				<ActionIcon
					type="edit"
					title="Edit status change"
					disabled={readOnly}
					//active={state.isOpen}
					onClick={state.isOpen ? methods.close : methods.open}
				/>
			)}
			dropdownRenderer={({ props, methods }) => (
				<MemberStatusChangeForm
					entry={entry}
					onChange={onChange}
					close={methods.close}
					{...props}
				/>
			)}
			disabled={readOnly}
			portal={document.querySelector("#root")!}
		/>
	);
}

const statusChangeHistoryColumns = [
	{
		key: "Date",
		label: "Date",
		renderCell: (entry: StatusChangeEntry) =>
			entry.Date ? displayDate(entry.Date) : "-",
	},
	{ key: "OldStatus", label: "Old status" },
	{ key: "NewStatus", label: "New status" },
	{ key: "Reason", label: "Reason" },
	{
		key: "actions",
		label: "",
		gridTemplate: "60px",
		styleCell: { justifyContent: "space-around" },
	},
];

function MemberStatusChangeHistory({
	member,
	saved,
	updateMember,
	readOnly,
}: {
	member: MultipleMember;
	saved?: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const statusChangeHistory = member.StatusChangeHistory;
	let statusChangeDate = "";
	if (!isMultiple(member.StatusChangeDate) && member.StatusChangeDate)
		statusChangeDate =
			DateTime.fromISO(member.StatusChangeDate).toISODate() || "";

	const columns = React.useMemo(() => {
		function update(id: number, changes: Partial<StatusChangeEntry>) {
			const StatusChangeHistory = statusChangeHistory.map((h) =>
				h.id === id ? { ...h, ...changes } : h
			);
			updateMember({ StatusChangeHistory });
		}

		function addClick() {
			let id = 0;
			for (const h of statusChangeHistory) if (h.id > id) id = h.id + 1;
			const entry: StatusChangeEntry = {
				id,
				Date: new Date().toISOString(),
				NewStatus: member.Status as StatusType,
				OldStatus: member.Status as StatusType,
				Reason: "New member",
			};
			const StatusChangeHistory = [entry].concat(...statusChangeHistory);
			updateMember({ StatusChangeHistory });
		}

		function remove(id: number) {
			const StatusChangeHistory = statusChangeHistory.filter(
				(h) => h.id !== id
			);
			updateMember({ StatusChangeHistory });
		}

		const columns = statusChangeHistoryColumns.map((col) => {
			if (col.key === "actions") {
				const label = <ActionIcon type="add" onClick={addClick} />;
				const renderCell = (entry: StatusChangeEntry) => (
					<>
						<MemberStatusChangeDropdown
							entry={entry}
							onChange={(changes: StatusChangeEntry) =>
								update(entry.id, changes)
							}
							readOnly={readOnly}
						/>
						<ActionIcon
							type="delete"
							onClick={() => remove(entry.id)}
							disabled={readOnly}
						/>
					</>
				);

				return { ...col, label, renderCell };
			}
			return col;
		});
		return columns;
	}, [member, statusChangeHistory, readOnly, updateMember]);

	return (
		<div>
			<Row>
				<Field label="Status:">
					<StatusSelector
						style={{
							flexBasis: 200,
							...hasChangesStyle(member, saved, "Status"),
						}}
						value={member.Status}
						onChange={(value) => updateMember({ Status: value })}
						readOnly={readOnly}
					/>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<label>Override</label>
						<Checkbox
							style={hasChangesStyle(
								member,
								saved,
								"StatusChangeOverride"
							)}
							checked={Boolean(member.StatusChangeOverride)}
							indeterminate={isMultiple(
								member.StatusChangeOverride
							)}
							onChange={(
								e: React.ChangeEvent<HTMLInputElement>
							) =>
								updateMember({
									StatusChangeOverride: e.target.checked,
								})
							}
							disabled={readOnly}
						/>
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<label>Last change</label>
						<Input
							type="date"
							style={hasChangesStyle(
								member,
								saved,
								"StatusChangeDate"
							)}
							value={statusChangeDate}
							onChange={(e) =>
								updateMember({
									StatusChangeDate: e.target.value,
								})
							}
							placeholder={
								isMultiple(member.StatusChangeDate)
									? MULTIPLE_STR
									: undefined
							}
						/>
					</div>
				</Field>
			</Row>
			<Table
				style={hasChangesStyle(member, saved, "StatusChangeHistory")}
				columns={columns}
				values={statusChangeHistory}
			/>
		</div>
	);
}

export default MemberStatusChangeHistory;
