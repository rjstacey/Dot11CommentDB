import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
	ActionButton,
	displayDateRange,
	DropdownRendererProps,
	Checkbox,
	Row,
	Form,
	FieldLeft,
	ActionButtonDropdown,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	importAttendances,
	selectAttendanceSessions,
} from "../store/sessionParticipation";
import { type Session } from "../store/sessions";

import BulkStatusUpdate from "./BulkStatusUpdate";
import { SessionParticipationTableActions } from "./table";

function ImportAttendanceForm({
	methods,
	session,
}: DropdownRendererProps & { session: Session }) {
	const dispatch = useAppDispatch();
	const [useDailyAttendance, setUseDailyAttendance] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	let warning: string | undefined;
	if (session.attendees) {
		warning =
			"Importing again will reset any overrides that were previously made for this session";
	}

	async function submit() {
		setBusy(true);
		await dispatch(importAttendances(session.id, useDailyAttendance));
		methods.close();
		setBusy(false);
	}

	return (
		<Form
			style={{ maxWidth: 350 }}
			title={`Import attenance for session ${
				session.number || `id=${session.id}`
			}`}
			cancel={methods.close}
			submit={submit}
			errorText={warning}
			busy={busy}
		>
			<Row>
				<FieldLeft label="IMAT spreadsheet:" />
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={!useDailyAttendance}
					onChange={() => setUseDailyAttendance(!useDailyAttendance)}
				/>
				<label>attendance summary</label>
			</Row>
			<Row style={{ justifyContent: "flex-start" }}>
				<Checkbox
					checked={useDailyAttendance}
					onChange={() => setUseDailyAttendance(!useDailyAttendance)}
				/>
				<label>daily attendance</label>
			</Row>
		</Form>
	);
}

function SessionSummary() {
	const sessions = useAppSelector(selectAttendanceSessions);

	return (
		<div style={{ display: "flex", overflow: "auto", margin: "10px 0" }}>
			{sessions.map((session) => (
				<div
					key={session.id}
					style={{
						display: "flex",
						flexDirection: "column",
						margin: "0 5px",
					}}
				>
					<div style={{ whiteSpace: "nowrap" }}>
						{session.number}{" "}
						{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
						{displayDateRange(session.startDate, session.endDate)}
					</div>
					<div
						style={{
							whiteSpace: "nowrap",
							textOverflow: "ellipsis",
							overflow: "hidden",
							maxWidth: 200,
						}}
					>
						{session.name}
					</div>
					<div style={{ display: "flex" }}>
						<div>{`(${session.attendees} attendees)`}</div>
						<ActionButtonDropdown
							name="import"
							title="Import attendance summary"
							dropdownRenderer={(props) => (
								<ImportAttendanceForm
									{...props}
									session={session}
								/>
							)}
							portal={
								document.querySelector("#root") || undefined
							}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

function SessionPartipationActions() {
	const navigate = useNavigate();
	const refresh = () => navigate(".", { replace: true });

	return (
		<>
			<div className="top-row">
				<SessionSummary />
			</div>
			<div className="top-row justify-right">
				<div className="control-group">
					<BulkStatusUpdate isSession={true} />
					<SessionParticipationTableActions />
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
				</div>
			</div>
		</>
	);
}

export default SessionPartipationActions;
