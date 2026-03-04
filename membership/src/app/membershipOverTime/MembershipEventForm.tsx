import { useState } from "react";
import { Form } from "react-bootstrap";
import { ConfirmModal } from "@common";
import type {
	MembershipEvent,
	MembershipEventCreate,
} from "@/store/membershipOverTime";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function MembershipEventForm({
	action,
	entry,
	hasChanges,
	onChange,
	submit,
	cancel,
	readOnly,
}: {
	action: "add" | "update";
	entry: MembershipEvent | MembershipEventCreate;
	hasChanges: () => boolean;
	onChange: (changes: Partial<MembershipEvent>) => void;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = useState(false);

	async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
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
		<Form noValidate validated onSubmit={handleSubmit}>
			<Form.Group className="mb-3" controlId="membership-event-date">
				<Form.Label>Date:</Form.Label>
				<Form.Control
					type="date"
					value={entry.date}
					onChange={(e) => onChange({ date: e.target.value })}
					placeholder="(Blank)"
					readOnly={readOnly}
					required
				/>
				<Form.Control.Feedback type="invalid">
					Provide a date for the membership event
				</Form.Control.Feedback>
			</Form.Group>
			<Form.Group className="mb-3" controlId="membership-event-count">
				<Form.Label>Count:</Form.Label>
				<Form.Control
					type="number"
					value={entry.count}
					onChange={(e) =>
						onChange({ count: Number(e.target.value) })
					}
					placeholder="(Blank)"
					readOnly={readOnly}
					required
				/>
				<Form.Control.Feedback type="invalid">
					Provide a count for the membership event
				</Form.Control.Feedback>
			</Form.Group>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel={action === "add" ? "Add" : "Update"}
					busy={busy}
					cancel={cancel}
				/>
			)}
		</Form>
	);
}
