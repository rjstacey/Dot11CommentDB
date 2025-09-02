import * as React from "react";
import { Form, Row, Col, Button, Spinner } from "react-bootstrap";
import { AffiliationMap } from "@/store/affiliationMap";
import { ConfirmModal } from "@common";

export type EditAction = "view" | "update" | "add";

function SubmitCancel({
	action,
	busy,
	cancel,
}: {
	action: EditAction;
	busy?: boolean;
	cancel?: () => void;
}) {
	if (action !== "add" && action !== "update") return null;
	return (
		<Form.Group as={Row} className="mb-3">
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit">
					{busy && <Spinner animation="border" size="sm" />}
					{action === "add" ? "Add" : "Update"}
				</Button>
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				<Button variant="secondary" onClick={cancel}>
					Cancel
				</Button>
			</Col>
		</Form.Group>
	);
}

export function AffiliationMapEntryForm({
	action,
	entry,
	change,
	busy,
	submit,
	cancel,
	readOnly,
}: {
	action: EditAction;
	entry: AffiliationMap;
	change: (changes: Partial<AffiliationMap>) => void;
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!e.currentTarget.checkValidity()) {
			ConfirmModal.show("Fix errors", false);
			return;
		}
		submit?.();
	}

	return (
		<Form noValidate validated onSubmit={handleSubmit}>
			<Form.Group className="mb-3" controlId="affiliation-match">
				<Form.Label>Match expression:</Form.Label>
				<Form.Control
					type="search"
					value={entry.match}
					onChange={(e) => change({ match: e.target.value })}
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
						change({ shortAffiliation: e.target.value })
					}
					placeholder="(Blank)"
					readOnly={readOnly}
					required
				/>
				<Form.Control.Feedback type="invalid">
					Provide a short name for the affiliation
				</Form.Control.Feedback>
			</Form.Group>
			<SubmitCancel action={action} busy={busy} cancel={cancel} />
		</Form>
	);
}
