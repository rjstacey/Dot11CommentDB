import React from "react";
import { Row, Form } from "react-bootstrap";

import type { SessionAttendanceUpdateManyState } from "@/hooks/sessionAttendanceEdit";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function AttendanceUpdateForm({
	state,
	hasChanges,
	submit,
	cancel,
}: {
	state: SessionAttendanceUpdateManyState;
	hasChanges: () => boolean;
	submit: (
		doAddMember?: boolean,
		doUpdateMember?: boolean,
		doUpdateAttendance?: boolean,
	) => Promise<void>;
	cancel: () => void;
}) {
	const [importAttendance, setImportAttendance] = React.useState(true);
	const [importNew, setImportNew] = React.useState(true);
	const [importUpdates, setImportUpdates] = React.useState(true);
	const [busy, setBusy] = React.useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await submit(importNew, importUpdates, importAttendance);
		setBusy(false);
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importAttendance}
					onChange={() => setImportAttendance(!importAttendance)}
					label="Update session attendance"
				/>
				<Form.Text>{`${state.attendanceAdds.length} adds`}</Form.Text>
				<Form.Text>{`${state.attendanceUpdates.length} updates`}</Form.Text>
				<Form.Text>{`${state.attendanceDeletes.length} deletes`}</Form.Text>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importNew}
					onChange={() => setImportNew(!importNew)}
					label="Add new members"
				/>
				<Form.Text>{`${state.memberAdds.length} new members`}</Form.Text>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importUpdates}
					onChange={() => setImportUpdates(!importUpdates)}
					label="Update member details"
				/>
				<Form.Text>{`${state.memberUpdates.length} members to be updated`}</Form.Text>
			</Form.Group>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel={"Submit"}
					cancel={cancel}
					busy={busy}
				/>
			)}
		</Form>
	);
}
