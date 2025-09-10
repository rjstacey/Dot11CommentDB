import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange } from "@/store/ballots";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

export function BallotDocumentRow({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const change: React.ChangeEventHandler<
		HTMLInputElement | HTMLTextAreaElement
	> = (e) => {
		const { name, value } = e.target;
		updateBallot({ [name]: value });
	};

	return (
		<Form.Group as={Row} controlId="ballot-document" className="mb-3">
			<Form.Label column>Document:</Form.Label>
			<Col>
				<Form.Control
					type="search"
					name="Document"
					value={isMultiple(ballot.Document) ? "" : ballot.Document}
					placeholder={
						isMultiple(ballot.Document) ? MULTIPLE_STR : BLANK_STR
					}
					onChange={change}
					readOnly={readOnly}
				/>
			</Col>
		</Form.Group>
	);
}
