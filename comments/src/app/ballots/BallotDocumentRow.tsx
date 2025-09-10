import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange } from "@/store/ballots";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

export function BallotDocumentRow({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	return (
		<Form.Group as={Row} controlId="ballot-document" className="mb-3">
			<Form.Label column>Document version:</Form.Label>
			<Col>
				<Form.Control
					type="search"
					name="Document"
					value={isMultiple(ballot.Document) ? "" : ballot.Document}
					placeholder={
						isMultiple(ballot.Document) ? MULTIPLE_STR : BLANK_STR
					}
					onChange={(e) =>
						updateBallot({ [e.target.name]: e.target.value })
					}
					readOnly={readOnly}
				/>
			</Col>
			<Col>
				<Form.Text className="text-muted">
					The document version for this project (e.g., D1.0)
				</Form.Text>
			</Col>
		</Form.Group>
	);
}
