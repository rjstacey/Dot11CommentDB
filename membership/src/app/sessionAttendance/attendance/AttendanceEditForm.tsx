import React from "react";
import { Row, Col, Form, Button, Spinner } from "react-bootstrap";

import { ConfirmModal } from "@common";

import { AttendanceTabs } from "./AttendanceTabs";
import type { SessionAttendanceSummaryChange } from "@/store/attendanceSummaries";
import type { MemberChange } from "@/store/members";

import type {
	SessionAttendanceAddOneState,
	SessionAttendanceUpdateOneState,
} from "@/hooks/sessionAttendanceEdit";

export function AttendanceEditForm({
	state,
	sapin,
	memberOnChange,
	attendanceOnChange,
	hasMemberChanges,
	hasAttendanceChanges,
	submit,
	cancel,
	readOnly,
}: {
	state: SessionAttendanceAddOneState | SessionAttendanceUpdateOneState;
	submit: (
		doAddMembers: boolean,
		doUpdateMembers: boolean,
		doUpdateAttendance: boolean,
	) => Promise<void>;
	cancel: () => void;
	sapin: number;
	memberOnChange: (changes: MemberChange) => void;
	attendanceOnChange: (changes: SessionAttendanceSummaryChange) => void;
	hasMemberChanges: () => boolean;
	hasAttendanceChanges: () => boolean;
	readOnly?: boolean;
}) {
	const formRef = React.useRef<HTMLFormElement>(null);
	const [busy, setBusy] = React.useState(false);

	async function handleMemberSubmit(e: React.MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		setBusy(true);
		await submit(true, true, false);
		setBusy(false);
	}

	async function handleAttendanceSubmit(
		e: React.MouseEvent<HTMLButtonElement>,
	) {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		setBusy(true);
		await submit(false, false, true);
		setBusy(false);
	}

	const hasChanges = hasMemberChanges() || hasAttendanceChanges();

	return (
		<Form ref={formRef} noValidate validated className="p-3">
			<Row>
				<AttendanceTabs
					sapin={sapin}
					editedMember={state.memberEdit}
					savedMember={state.memberSaved}
					memberOnChange={memberOnChange}
					editedAttendance={state.attendanceEdit}
					savedAttendance={state.attendanceSaved}
					attendanceOnChange={attendanceOnChange}
					readOnly={readOnly}
				/>
			</Row>
			{hasChanges && (
				<Row className="mb-3">
					<Col className="d-flex justify-content-center">
						<Button
							onClick={handleMemberSubmit}
							disabled={
								!hasMemberChanges() ||
								!formRef.current?.checkValidity()
							}
						>
							<Spinner
								size="sm"
								hidden={!busy || !hasMemberChanges()}
								className="me-2"
							/>
							{state.action === "addOne"
								? "Add Member"
								: "Update Member"}
						</Button>
					</Col>
					<Col className="d-flex justify-content-center">
						<Button
							onClick={handleAttendanceSubmit}
							disabled={
								!hasAttendanceChanges() ||
								!formRef.current?.checkValidity()
							}
						>
							<Spinner
								size="sm"
								hidden={!busy || !hasAttendanceChanges()}
								className="me-2"
							/>
							{"Update Attendance"}
						</Button>
					</Col>
					<Col className="d-flex justify-content-center">
						<Button variant="secondary" onClick={cancel}>
							{"Cancel"}
						</Button>
					</Col>
				</Row>
			)}
		</Form>
	);
}
