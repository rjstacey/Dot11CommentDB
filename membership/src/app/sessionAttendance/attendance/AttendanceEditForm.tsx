import React from "react";
import { Row, Col, Form, Button, Spinner } from "react-bootstrap";

import { ConfirmModal } from "@common";

import { AttendanceTabs } from "./AttendanceTabs";
import type {
	SessionAttendanceSummary,
	SessionAttendanceSummaryChange,
} from "@/store/attendanceSummaries";
import type { Member, MemberChange, MemberCreate } from "@/store/members";

import type { EditAction } from "@/hooks/sessionAttendanceEdit";

export function AttendanceEditForm({
	action,
	sapin,
	editedMember,
	savedMember,
	memberOnChange,
	editedAttendance,
	savedAttendance,
	attendanceOnChange,
	hasMemberChanges,
	hasAttendanceChanges,
	submit,
	cancel,
	readOnly,
}: {
	submit: (
		doAddMembers: boolean,
		doUpdateMembers: boolean,
		doUpdateAttendance: boolean,
	) => Promise<void>;
	cancel: () => void;
	action: EditAction;
	sapin: number;
	editedMember: Member | MemberCreate;
	savedMember?: Member;
	memberOnChange: (changes: MemberChange) => void;
	editedAttendance: SessionAttendanceSummary;
	savedAttendance: SessionAttendanceSummary;
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
					action={action}
					sapin={sapin}
					editedMember={editedMember}
					savedMember={savedMember}
					memberOnChange={memberOnChange}
					editedAttendance={editedAttendance}
					savedAttendance={savedAttendance}
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
							{"Update Member"}
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
