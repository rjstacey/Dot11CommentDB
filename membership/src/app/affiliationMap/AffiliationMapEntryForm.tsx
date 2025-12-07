import * as React from "react";
import { Form } from "react-bootstrap";
import { ConfirmModal } from "@common";
import type {
	AffiliationMap,
	AffiliationMapCreate,
} from "@/store/affiliationMap";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function AffiliationMapEntryForm({
	action,
	entry,
	hasChanges,
	onChange,
	submit,
	cancel,
	readOnly,
}: {
	action: "add" | "update";
	entry: AffiliationMap | AffiliationMapCreate;
	hasChanges: () => boolean;
	onChange: (changes: Partial<AffiliationMap>) => void;
	submit: () => void;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		setBusy(true);
		submit();
		setBusy(false);
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit}>
			<Form.Group className="mb-3" controlId="affiliation-match">
				<Form.Label>Match expression:</Form.Label>
				<Form.Control
					type="search"
					value={entry.match}
					onChange={(e) => onChange({ match: e.target.value })}
					placeholder="(Blank)"
					readOnly={readOnly}
					required
				/>
				<Form.Control.Feedback type="invalid">
					Provide a match expression; regex or simple case insensitive
					match string
				</Form.Control.Feedback>
			</Form.Group>
			<Form.Group className="mb-3" controlId="affiliation-short-name">
				<Form.Label>Short affiliation name:</Form.Label>
				<Form.Control
					type="text"
					value={entry.shortAffiliation}
					onChange={(e) =>
						onChange({ shortAffiliation: e.target.value })
					}
					placeholder="(Blank)"
					readOnly={readOnly}
					required
				/>
				<Form.Control.Feedback type="invalid">
					Provide a short name for the affiliation
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
