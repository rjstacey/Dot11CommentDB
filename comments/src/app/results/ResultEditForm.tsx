import React from "react";
import { Form, Row, Col } from "react-bootstrap";
import { TextArea } from "@common";

import { type Result, type ResultChange } from "@/store/results";
import { SelectVote } from "./SelectVote";
import { MemberSelect } from "../voters/MemberSelect";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function ResultEditForm({
	action,
	edited,
	onChange,
	hasChanges,
	submit,
	cancel,
	readOnly,
}: {
	action: "add" | "update";
	edited: Result;
	onChange: (changes: ResultChange) => void;
	hasChanges: () => boolean;
	submit: () => Promise<void>;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);
	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	let className = "p-3";
	if (readOnly) className += " pe-none";

	return (
		<Form onSubmit={onSubmit} className={className}>
			<Row className="mb-3">
				<Form.Label column htmlFor="result-name">
					Name:
				</Form.Label>
				<Col>
					<MemberSelect
						id="result-name"
						value={edited.SAPIN!}
						onChange={() => {}}
						readOnly
					/>
				</Col>
			</Row>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column htmlFor="result-vote">
					Vote:
				</Form.Label>
				<Col xs="auto">
					<SelectVote
						id="result-vote"
						value={edited.vote}
						onChange={(vote) => onChange({ vote })}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column htmlFor="results-notes">
					Notes:
				</Form.Label>
				<Col xs={12}>
					<TextArea
						style={{ width: "100%" }}
						id="results-notes"
						rows={2}
						value={edited.notes || ""}
						onChange={(e) => onChange({ notes: e.target.value })}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel={action === "add" ? "Add" : "Update"}
					cancel={cancel}
					busy={busy}
				/>
			)}
		</Form>
	);
}
