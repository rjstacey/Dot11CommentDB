import React from "react";
import { Row, Form } from "react-bootstrap";

import { ConfirmModal } from "@common";

import { AttendanceTabs } from "./AttendanceTabs";
import type { SessionAttendanceSummaryChange } from "@/store/attendanceSummaries";
import type { MemberChange, MemberCreate } from "@/store/members";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";

import type {
	EditAction,
	MultipleMember,
	MultipleSessionAttendanceSummary,
} from "@/edit/sessionAttendanceEdit";

export function AttendanceEditForm({
	action,
	sapin,
	editedMember,
	savedMember,
	memberOnChange,
	editedAttendance,
	savedAttendance,
	attendanceOnChange,
	hasChanges,
	submit,
	cancel,
	readOnly,
}: {
	submit: () => Promise<void>;
	cancel: () => void;
	action: EditAction;
	sapin: number;
	editedMember: MultipleMember | MemberCreate;
	savedMember?: MultipleMember;
	memberOnChange: (changes: MemberChange) => void;
	editedAttendance: MultipleSessionAttendanceSummary;
	savedAttendance: MultipleSessionAttendanceSummary;
	attendanceOnChange: (changes: SessionAttendanceSummaryChange) => void;
	hasChanges: () => boolean;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
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
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel={action === "addOne" ? "Add" : "Update"}
					cancel={cancel}
					busy={busy}
				/>
			)}
		</Form>
	);
}
