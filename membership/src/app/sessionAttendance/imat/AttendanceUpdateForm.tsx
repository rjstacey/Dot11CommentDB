import React from "react";
import { Row, Form } from "react-bootstrap";

import type { MemberCreate, MemberUpdate } from "@/store/members";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function AttendanceUpdateForm({
	adds,
	updates,
	hasChanges,
	submit,
	cancel,
}: {
	adds: MemberCreate[];
	updates: MemberUpdate[];
	hasChanges: () => boolean;
	submit: (
		doAddMember?: boolean,
		doUpdateMember?: boolean,
		doUpdateAttendance?: boolean
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
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importNew}
					onChange={() => setImportNew(!importNew)}
					label="Add new members"
				/>
				<Form.Text>{`${adds.length} new members`}</Form.Text>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Check
					checked={importUpdates}
					onChange={() => setImportUpdates(!importUpdates)}
					label="Update member details"
				/>
				<Form.Text>{`${updates.length} members to be updated`}</Form.Text>
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
