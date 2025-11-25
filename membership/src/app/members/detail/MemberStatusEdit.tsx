import * as React from "react";
import {
	Row,
	Col,
	Button,
	FormGroup,
	Form,
	FormLabel,
	FormControl,
	FormCheck,
	Dropdown,
} from "react-bootstrap";
import { DateTime } from "luxon";

import { isMultiple } from "@common";

import type {
	MemberChange,
	StatusChangeEntry,
	StatusType,
} from "@/store/members";

import { EditTable as Table } from "@/components/Table";
import { hasChangesStyle } from "@/components/utils";
import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";

import StatusSelector from "./StatusSelector";
import type { MultipleMember } from "./useMembersEdit";

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
		<Form className="p-3" style={{ width: 350 }}>
			<FormGroup as={Row} controlId="date" className="mb-2">
				<FormLabel column>Date:</FormLabel>
				<Col xs="auto">
					<FormControl
						type="date"
						value={date}
						onChange={(e) => change({ Date: e.target.value })}
					/>
				</Col>
			</FormGroup>
			<FormGroup as={Row} className="mb-2">
				<FormLabel column htmlFor="oldStatus">
					Old status:
				</FormLabel>
				<Col xs="auto">
					<StatusSelector
						id="oldStatus"
						value={entry.OldStatus}
						onChange={(value) => change({ OldStatus: value })}
						placeholder={BLANK_STR}
					/>
				</Col>
			</FormGroup>
			<FormGroup as={Row} className="mb-2">
				<FormLabel column htmlFor="newStatus">
					New status:
				</FormLabel>
				<Col xs="auto">
					<StatusSelector
						id="newStatus"
						value={entry.NewStatus}
						onChange={(value) => change({ NewStatus: value })}
						placeholder={BLANK_STR}
					/>
				</Col>
			</FormGroup>
			<FormGroup as={Row} controlId="reason" className="mb-2">
				<FormLabel column>Reason:</FormLabel>
				<Col xs="auto">
					<FormControl
						type="text"
						value={entry.Reason}
						onChange={(e) => change({ Reason: e.target.value })}
						placeholder={BLANK_STR}
					/>
				</Col>
			</FormGroup>
		</Form>
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
	const [show, setShow] = React.useState(false);
	return (
		<Dropdown align="end" show={show} onToggle={setShow}>
			<Dropdown.Toggle
				variant="outline-primary"
				className="bi-pencil"
				title="Edit status change"
				disabled={readOnly}
			/>
			<Dropdown.Menu>
				<MemberStatusChangeForm
					entry={entry}
					onChange={onChange}
					close={() => {
						setShow(false);
					}}
				/>
			</Dropdown.Menu>
		</Dropdown>
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
		gridTemplate: "80px",
		styleCell: { justifyContent: "space-around" },
	},
];

export function MemberStatusEdit({
	edited,
	saved,
	onChange,
	readOnly,
}: {
	edited: MultipleMember;
	saved?: MultipleMember;
	onChange: (changes: MemberChange) => void;
	readOnly?: boolean;
}) {
	const statusChangeHistory = edited.StatusChangeHistory;
	let statusChangeDate = "";
	if (!isMultiple(edited.StatusChangeDate) && edited.StatusChangeDate)
		statusChangeDate =
			DateTime.fromISO(edited.StatusChangeDate).toISODate() || "";

	const columns = React.useMemo(() => {
		function update(id: number, changes: Partial<StatusChangeEntry>) {
			const StatusChangeHistory = statusChangeHistory.map((h) =>
				h.id === id ? { ...h, ...changes } : h
			);
			onChange({ StatusChangeHistory });
		}

		function addClick() {
			let id = 0;
			for (const h of statusChangeHistory) if (h.id > id) id = h.id + 1;
			const entry: StatusChangeEntry = {
				id,
				Date: new Date().toISOString(),
				NewStatus: edited.Status as StatusType,
				OldStatus: edited.Status as StatusType,
				Reason: "New member",
			};
			const StatusChangeHistory = [entry].concat(...statusChangeHistory);
			onChange({ StatusChangeHistory });
		}

		function remove(id: number) {
			const StatusChangeHistory = statusChangeHistory.filter(
				(h) => h.id !== id
			);
			onChange({ StatusChangeHistory });
		}

		const columns = statusChangeHistoryColumns.map((col) => {
			if (col.key === "actions") {
				const label = (
					<Button
						variant="outline-primary"
						className="bi-plus-lg"
						onClick={addClick}
					/>
				);
				const renderCell = (entry: StatusChangeEntry) => (
					<div className="d-flex gap-2">
						<MemberStatusChangeDropdown
							entry={entry}
							onChange={(changes: StatusChangeEntry) =>
								update(entry.id, changes)
							}
							readOnly={readOnly}
						/>
						<Button
							variant="outline-danger"
							className="bi-trash"
							onClick={() => remove(entry.id)}
							disabled={readOnly}
						/>
					</div>
				);

				return { ...col, label, renderCell };
			}
			return col;
		});
		return columns;
	}, [edited, statusChangeHistory, readOnly, onChange]);

	return (
		<>
			<Row className="mb-3">
				<FormGroup as={Col}>
					<FormLabel htmlFor="status">Status:</FormLabel>
					<StatusSelector
						id="status"
						style={{
							flexBasis: 200,
							...hasChangesStyle(edited, saved, "Status"),
						}}
						value={edited.Status}
						onChange={(value) => onChange({ Status: value })}
						readOnly={readOnly}
					/>
				</FormGroup>
				<FormGroup as={Col} controlId="statusChangeOverride">
					<FormLabel>Override</FormLabel>
					<FormCheck
						style={hasChangesStyle(
							edited,
							saved,
							"StatusChangeOverride"
						)}
						checked={Boolean(edited.StatusChangeOverride)}
						//indeterminate={isMultiple(edited.StatusChangeOverride)}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							onChange({
								StatusChangeOverride: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				</FormGroup>
				<FormGroup as={Col} controlId="statusChangeDate">
					<FormLabel>Last change</FormLabel>
					<FormControl
						type="date"
						style={hasChangesStyle(
							edited,
							saved,
							"StatusChangeDate"
						)}
						value={statusChangeDate}
						onChange={(e) =>
							onChange({
								StatusChangeDate: e.target.value,
							})
						}
						placeholder={
							isMultiple(edited.StatusChangeDate)
								? MULTIPLE_STR
								: undefined
						}
					/>
				</FormGroup>
			</Row>
			<Row className="mb-3">
				<Table
					style={hasChangesStyle(
						edited,
						saved,
						"StatusChangeHistory"
					)}
					columns={columns}
					values={statusChangeHistory}
				/>
			</Row>
		</>
	);
}
