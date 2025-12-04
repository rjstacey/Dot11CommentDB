import React from "react";
import { Row, Form } from "react-bootstrap";

import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function RegistrationUpdateForm({
	attendances,
	hasChanges,
	submit,
	cancel,
}: {
	attendances: unknown[];
	hasChanges: () => boolean;
	submit: () => Promise<void>;
	cancel: () => void;
}) {
	const [busy, setBusy] = React.useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit} className="p-3">
			<Form.Group as={Row} className="mb-3">
				<Form.Text>{`${attendances.length} updates`}</Form.Text>
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
