import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange, BallotType } from "@/store/ballots";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

export function BallotEpollRow({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const isMultipleBallots = isMultiple(ballot.id);

	if (ballot.Type !== BallotType.SA) return null;
	return (
		<Form.Group as={Row} controlId="ballot-epoll-number" className="mb-3">
			<Form.Label column>ePoll number:</Form.Label>
			<Col xs="auto">
				<Form.Control
					type="search"
					name="EpollNum"
					value={
						"" +
						(isMultiple(ballot.EpollNum) ? "" : ballot.EpollNum)
					}
					onChange={(e) =>
						updateBallot({
							EpollNum: Number(e.target.value),
						})
					}
					placeholder={
						isMultiple(ballot.EpollNum) ? MULTIPLE_STR : BLANK_STR
					}
					readOnly={readOnly || isMultipleBallots}
				/>
			</Col>
		</Form.Group>
	);
}
