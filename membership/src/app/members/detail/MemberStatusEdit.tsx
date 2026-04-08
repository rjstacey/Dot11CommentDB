import { useState, useMemo, useCallback } from "react";
import {
	Row,
	Col,
	Button,
	FormGroup,
	FormLabel,
	FormControl,
	FormCheck,
	Dropdown,
} from "react-bootstrap";
import { DateTime } from "luxon";

import { isMultiple } from "@common";

import type {
	MemberChange,
	MemberCreate,
	StatusChangeEntry,
} from "@/store/members";

import { EditTable as Table } from "@/components/Table";
import { hasChangesStyle } from "@/components/utils";
import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";

import StatusSelector from "./StatusSelector";
import type { MultipleMember } from "@/hooks/membersEdit";

const displayDate = (isoDateTime: string) =>
	DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function MemberStatusChangeForm({
	entry,
	onChange,
}: {
	entry: StatusChangeEntry;
	onChange: (entry: StatusChangeEntry) => void;
}) {
	function change(changes: Partial<StatusChangeEntry>) {
		onChange({ ...entry, ...changes });
	}

	const date = entry.Date?.substring(0, 10);

	return (
		<div className="p-3">
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
		</div>
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
	const [show, setShow] = useState(false);
	return (
		<Dropdown align="end" show={show} onToggle={setShow}>
			<Dropdown.Toggle
				variant="outline-primary"
				className="bi-pencil"
				title="Edit status change"
				disabled={readOnly}
			/>
			<Dropdown.Menu>
				<MemberStatusChangeForm entry={entry} onChange={onChange} />
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
	edited: MultipleMember | MemberCreate;
	saved?: MultipleMember;
	onChange: (changes: MemberChange) => void;
	readOnly?: boolean;
}) {
	const statusChangeHistory = edited.StatusChangeHistory ?? [];
	let statusChangeDate = "";
	if (!isMultiple(edited.StatusChangeDate) && edited.StatusChangeDate)
		statusChangeDate =
			DateTime.fromISO(edited.StatusChangeDate).toISODate() || "";

	function changeStatusChangeDate(date: string) {
		try {
			const dateTime = DateTime.fromISO(date);
			if (dateTime.isValid)
				onChange({ StatusChangeDate: dateTime.toISO() });
		} catch (error) {
			console.error("Invalid date:", error);
		}
	}

	const updateEntry = useCallback(
		(id: number, changes: Partial<StatusChangeEntry>) => {
			const StatusChangeHistory = edited.StatusChangeHistory!.map((h) =>
				h.id === id ? { ...h, ...changes } : h,
			);
			onChange({ StatusChangeHistory });
		},
		[edited.StatusChangeHistory, onChange],
	);

	const addEntry = useCallback(() => {
		const id =
			Math.max(0, ...edited.StatusChangeHistory!.map((h) => h.id)) + 1;
		const entry: StatusChangeEntry = {
			id,
			Date: new Date().toISOString(),
			NewStatus: edited.Status,
			OldStatus: edited.Status,
			Reason: "New member",
		};
		const StatusChangeHistory = [entry].concat(
			...edited.StatusChangeHistory!,
		);
		onChange({ StatusChangeHistory });
	}, [edited.StatusChangeHistory, edited.Status, onChange]);

	const removeEntry = useCallback(
		(id: number) => {
			const StatusChangeHistory = edited.StatusChangeHistory!.filter(
				(h) => h.id !== id,
			);
			onChange({ StatusChangeHistory });
		},
		[edited.StatusChangeHistory, onChange],
	);

	const columns = useMemo(
		() =>
			statusChangeHistoryColumns.map((col) => {
				if (col.key === "actions") {
					const label = (
						<Button
							variant="outline-primary"
							className="bi-plus-lg"
							onClick={addEntry}
						/>
					);
					const renderCell = (entry: StatusChangeEntry) => (
						<div className="d-flex gap-2">
							<MemberStatusChangeDropdown
								entry={entry}
								onChange={(changes: StatusChangeEntry) =>
									updateEntry(entry.id, changes)
								}
								readOnly={readOnly}
							/>
							<Button
								variant="outline-danger"
								className="bi-trash"
								onClick={() => removeEntry(entry.id)}
								disabled={readOnly}
							/>
						</div>
					);

					return { ...col, label, renderCell };
				}
				return col;
			}),
		[addEntry, updateEntry, removeEntry, readOnly],
	);

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
							"StatusChangeOverride",
						)}
						checked={Boolean(edited.StatusChangeOverride)}
						ref={(ref) => {
							if (ref)
								ref.indeterminate = isMultiple(
									edited.StatusChangeOverride,
								);
						}}
						onChange={(e) =>
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
							"StatusChangeDate",
						)}
						value={statusChangeDate}
						onChange={(e) => changeStatusChangeDate(e.target.value)}
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
						"StatusChangeHistory",
					)}
					columns={columns}
					values={statusChangeHistory}
				/>
			</Row>
		</>
	);
}
