import React from "react";
import { Row, Form } from "react-bootstrap";

import { ConfirmModal } from "@common";

import { AttendanceTabs } from "./AttendanceTabs";
import type { SessionAttendanceSummaryChange } from "@/store/attendanceSummaries";
import type { MemberChange } from "@/store/members";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";

import type {
	EditAction,
	MultipleMember,
	MultipleSessionAttendanceSummary,
} from "./useMemberAttendanceEdit";

export function AttendanceEditForm({
	action,
	sapins,
	editedMember,
	savedMember,
	onChangeMember,
	editedAttendance,
	savedAttendance,
	onChangeAttendance,
	submit,
	cancel,
	readOnly,
}: {
	submit?: () => Promise<void>;
	cancel: () => void;
	action: EditAction;
	sapins: number[];
	editedMember: MultipleMember;
	savedMember?: MultipleMember;
	onChangeMember: (changes: MemberChange) => void;
	editedAttendance: MultipleSessionAttendanceSummary;
	savedAttendance: MultipleSessionAttendanceSummary;
	onChangeAttendance: (changes: SessionAttendanceSummaryChange) => void;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		if (submit) {
			setBusy(true);
			await submit();
			setBusy(false);
		}
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			<Row>
				<AttendanceTabs
					action={action}
					sapins={sapins}
					editedMember={editedMember}
					savedMember={savedMember}
					onChangeMember={onChangeMember}
					editedAttendance={editedAttendance}
					savedAttendance={savedAttendance}
					onChangeAttendance={onChangeAttendance}
					readOnly={readOnly}
				/>
			</Row>
			<SubmitCancelRow
				submitLabel={action === "add" ? "Add" : "Update"}
				cancel={cancel}
				busy={busy}
			/>
		</Form>
	);
}
