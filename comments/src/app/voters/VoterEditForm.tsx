import React from "react";
import { Row, Col, Form } from "react-bootstrap";

import { VoterChange, VoterCreate } from "@/store/voters";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

import { MemberSelect } from "./MemberSelect";
import { VoterStatusSelect } from "./VoterStatusSelect";

function VoterEdit({
	voter,
	change,
	readOnly,
}: {
	voter: VoterCreate;
	change: (changes: VoterChange) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column htmlFor="voter-member">
					Member:
				</Form.Label>
				<Col xs="auto" className="position-relative">
					<MemberSelect
						id="voter-member"
						value={voter.SAPIN}
						onChange={(value) => change({ SAPIN: value })}
						readOnly={readOnly}
						isInvalid={!voter.SAPIN}
					/>
					<Form.Control.Feedback type="invalid" tooltip>
						Select member
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column controlId="voter-status">
					Status:
				</Form.Label>
				<Col xs="auto">
					<VoterStatusSelect
						id="voter-status"
						value={voter.Status}
						onChange={(value) => change({ Status: value })}
						readOnly={readOnly}
						isInvalid={!voter.Status}
					/>
					<Form.Control.Feedback type="invalid" tooltip>
						Select voter status
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group
				as={Row}
				controlId="voter-excused"
				className="align-items-center mb-3"
				readOnly={readOnly}
				tabIndex={readOnly ? -1 : undefined}
			>
				<Form.Label column>Excused:</Form.Label>
				<Col xs="auto">
					<Form.Check
						checked={voter.Excused}
						onChange={() => change({ Excused: !voter.Excused })}
						tabIndex={readOnly ? -1 : undefined}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}

export function VoterEditForm({
	action,
	voter,
	onChange,
	hasChanges,
	submit,
	cancel,
	readOnly,
}: {
	action: "add" | "update";
	voter: VoterCreate | VoterCreate;
	onChange: (changes: VoterChange) => void;
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
		<Form noValidate validated onSubmit={onSubmit} className={className}>
			<VoterEdit voter={voter} change={onChange} readOnly={readOnly} />
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
