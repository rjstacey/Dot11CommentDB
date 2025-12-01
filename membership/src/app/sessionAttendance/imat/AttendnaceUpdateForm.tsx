import React from "react";
import { Row, Form } from "react-bootstrap";

import { ConfirmModal } from "@common";

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
	submit: () => Promise<void>;
	cancel: () => void;
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
			<Row className="mb-3">{`Add ${adds.length} members`}</Row>
			<Row className="mb-3">{`Update ${updates.length} members`}</Row>
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
