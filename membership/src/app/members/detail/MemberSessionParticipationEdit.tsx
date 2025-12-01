import * as React from "react";
import { Button, FormCheck, FormControl, Row, Col } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectMemberAttendanceStats } from "@/store/sessionParticipation";
import { SessionAttendanceSummary } from "@/store/attendanceSummaries";
import { selectSessionEntities } from "@/store/sessions";

import { EditTable as Table, TableColumn } from "@/components/Table";
import { renderSessionInfo } from "@/components/renderSessionInfo";

import { renderSessionParticipation } from "../../sessionParticipation/useRenderSessionParticipation";

const attendancesColumns: TableColumn[] = [
	{ key: "Session", label: "Session" },
	{
		key: "AttendancePercentage",
		label: "Attendance",
		styleCell: { justifyContent: "flex-end" },
	},
	{
		key: "IsRegistered",
		label: "Registered",
		styleCell: { justifyContent: "center" },
	},
	{
		key: "InPerson",
		label: "In-person",
		styleCell: { justifyContent: "center" },
	},
	{
		key: "DidAttend",
		label: "Did attend",
		styleCell: { justifyContent: "center" },
	},
	{
		key: "DidNotAttend",
		label: "Did not attend",
		styleCell: { justifyContent: "center" },
	},
	{ key: "Notes", label: "Notes" },
	{
		key: "SAPIN",
		label: "SA PIN",
		styleCell: { justifyContent: "flex-end" },
	},
];

function MemberSessionParticipationTable({
	session_ids,
	edited,
	onChange,
	sessionEntities,
	readOnly,
}: {
	session_ids: number[];
	edited: Record<number, SessionAttendanceSummary>;
	onChange: (
		session_id: number,
		changes: Partial<SessionAttendanceSummary>
	) => void;
	sessionEntities: Record<
		number,
		ReturnType<typeof selectSessionEntities>[number]
	>;
	readOnly?: boolean;
}) {
	const columns = React.useMemo(() => {
		return attendancesColumns.map((col) => {
			let renderCell:
				| ((
						entry: SessionAttendanceSummary
				  ) => JSX.Element | string | number)
				| undefined;
			if (col.key === "Session")
				renderCell = (entry) =>
					renderSessionInfo(sessionEntities[entry.session_id]);
			if (col.key === "AttendancePercentage")
				renderCell = (entry) =>
					`${(entry.AttendancePercentage || 0).toFixed(0)}%`;
			if (col.key === "IsRegistered") {
				renderCell = (entry) => (
					<FormCheck
						id={"is-registered-" + entry.session_id}
						checked={entry.IsRegistered || false}
						onChange={(e) =>
							onChange(entry.session_id, {
								IsRegistered: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "InPerson") {
				renderCell = (entry) => (
					<FormCheck
						id={"in-person-" + entry.session_id}
						checked={entry.InPerson || false}
						onChange={(e) =>
							onChange(entry.session_id, {
								InPerson: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "DidAttend") {
				renderCell = (entry) => (
					<FormCheck
						id={"did-attend-" + entry.session_id}
						checked={entry.DidAttend}
						onChange={(e) =>
							onChange(entry.session_id, {
								DidAttend: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "DidNotAttend") {
				renderCell = (entry) => (
					<FormCheck
						id={"did-not-attend-" + entry.session_id}
						checked={entry.DidNotAttend}
						onChange={(e) =>
							onChange(entry.session_id, {
								DidNotAttend: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "Notes") {
				renderCell = (entry) => (
					<FormControl
						id={"notes-" + entry.session_id}
						type="text"
						value={entry.Notes || ""}
						onChange={(e) =>
							onChange(entry.session_id, {
								Notes: e.target.value,
							})
						}
						disabled={readOnly}
					/>
				);
			}
			if (col.key === "SAPIN") {
				renderCell = (entry) =>
					entry.SAPIN !== entry.CurrentSAPIN ? entry.SAPIN : "";
			}

			if (renderCell) return { ...col, renderCell };

			return col;
		});
	}, [sessionEntities, readOnly, onChange]);

	const values = session_ids.map((session_id) => edited[session_id]);

	return (
		<Row>
			<Table columns={columns} values={values} />
		</Row>
	);
}

export function MemberSessionParticipationEdit({
	SAPIN,
	session_ids,
	edited,
	onChange,
	readOnly,
}: {
	SAPIN: number;
	session_ids: number[];
	edited: Record<number, SessionAttendanceSummary>;
	onChange: (
		session_id: number,
		changes: Partial<SessionAttendanceSummary>
	) => void;
	readOnly?: boolean;
}) {
	const sessionEntities = useAppSelector(selectSessionEntities);

	const { count, total } = useAppSelector((state) =>
		selectMemberAttendanceStats(state, SAPIN)
	);

	function copyToClipboard() {
		const html = renderSessionParticipation(
			SAPIN,
			session_ids,
			sessionEntities,
			edited
		);
		const type = "text/html";
		const blob = new Blob([html], { type });
		const data = [new ClipboardItem({ [type]: blob })];
		navigator.clipboard.write(data);
	}

	return (
		<>
			<Row className="d-flex align-items-center justify-content-between">
				<Col>{`Recent session attendance: ${count} / ${total}`}</Col>
				<Col xs="auto">
					<Button
						variant="outline-primary"
						className="bi-copy"
						title="Copy to clipboard"
						onClick={copyToClipboard}
					/>
				</Col>
			</Row>
			<MemberSessionParticipationTable
				session_ids={session_ids}
				edited={edited}
				onChange={onChange}
				sessionEntities={sessionEntities}
				readOnly={readOnly}
			/>
		</>
	);
}
