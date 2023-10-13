import React from "react";
import { DateTime } from "luxon";

import {
	Form,
	Row,
	Field,
	Input,
	ActionIcon,
	Dropdown,
} from "dot11-components";

import type { Member, StatusChangeType } from "../store/members";

import { EditTable as Table } from "../components/Table";

import StatusSelector from "./StatusSelector";
import type { MultipleMember } from "./MemberDetail";

const BLANK_STR = "(Blank)";

const displayDate = (isoDateTime: string) =>
	DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function MemberStatusChangeForm({
	entry: defaultEntry,
	onChange,
	close,
}: {
	entry: StatusChangeType;
	onChange: (entry: StatusChangeType) => void;
	close: () => void;
}) {
	const [entry, setEntry] = React.useState(defaultEntry);

	function submit() {
		onChange(entry);
		close();
	}

	function change(changes: Partial<StatusChangeType>) {
		setEntry({ ...entry, ...changes });
	}

	const date = entry.Date.substring(0, 10);

	return (
		<Form title="Edit status change" submit={submit} cancel={close}>
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
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							change({ Reason: e.target.value })
						}
						placeholder={BLANK_STR}
					/>
				</Field>
			</Row>
		</Form>
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
	updateMember,
	readOnly,
}: {
	member: MultipleMember;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const columns = React.useMemo(() => {
		function updateStatusChange(
			id: number,
			changes: Partial<StatusChangeType>
		) {
			const StatusChangeHistory = member.StatusChangeHistory.map((h) =>
				h.id === id ? { ...h, ...changes } : h
			);
			//console.log(id, changes, StatusChangeHistory)
			updateMember({ StatusChangeHistory });
		}

		function deleteStatusChange(id: number) {
			const StatusChangeHistory = member.StatusChangeHistory.filter(
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
								updateStatusChange(entry.id, changes)
							}
							readOnly={readOnly}
						/>
						<ActionIcon
							name="delete"
							onClick={() => deleteStatusChange(entry.id)}
							disabled={readOnly}
						/>
					</>
				);
				return { ...col, renderCell };
			}
			return col;
		});
		return columns;
	}, [member.StatusChangeHistory, readOnly, updateMember]);

	return <Table columns={columns} values={member.StatusChangeHistory} />;
}

export default MemberStatusChangeHistory;
