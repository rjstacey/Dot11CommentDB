import * as React from "react";
import { DateTime } from "luxon";

import {
	Row,
	Field,
	Input,
	ActionIcon,
	Dropdown,
} from "dot11-components";

import type { Member, StatusChangeType } from "../store/members";

import { EditTable as Table } from "../components/Table";

import StatusSelector from "./StatusSelector";
import { hasChangesStyle, MultipleMember } from "./MemberEdit";

const BLANK_STR = "(Blank)";

const displayDate = (isoDateTime: string) =>
	DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function MemberStatusChangeForm({
	entry,
	onChange,
	close,
}: {
	entry: StatusChangeType;
	onChange: (entry: StatusChangeType) => void;
	close: () => void;
}) {
	function change(changes: Partial<StatusChangeType>) {
		onChange({ ...entry, ...changes });
	}

	const date = entry.Date.substring(0, 10);

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
	entry: StatusChangeType;
	onChange: (entry: StatusChangeType) => void;
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
		renderCell: (entry: StatusChangeType) => displayDate(entry.Date),
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

	const columns = React.useMemo(() => {
		function update(
			id: number,
			changes: Partial<StatusChangeType>
		) {
			const StatusChangeHistory = statusChangeHistory.map((h) =>
				h.id === id ? { ...h, ...changes } : h
			);
			//console.log(id, changes, StatusChangeHistory)
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
				const renderCell = (entry: StatusChangeType) => (
					<>
						<MemberStatusChangeDropdown
							entry={entry}
							onChange={(changes: StatusChangeType) =>
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
				return { ...col, renderCell };
			}
			return col;
		});
		return columns;
	}, [statusChangeHistory, readOnly, updateMember]);

	return (
		<Table
			style={hasChangesStyle(member, saved, "StatusChangeHistory")}
			columns={columns}
			values={statusChangeHistory}
		/>
	);
}

export default MemberStatusChangeHistory;
