import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange, BallotType } from "@/store/ballots";
import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";

export function BallotEpollRow({
	ballot,
	original,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	original?: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	if (ballot.Type === BallotType.SA) return null;
	const isMultipleBallots = isMultiple(ballot.id);
	const cn =
		original && original.EpollNum !== ballot.EpollNum ? "has-changes" : "";
	return (
		<Form.Group
			as={Row}
			controlId="ballot-epoll-number"
			className="align-items-center mb-2"
		>
			<Form.Label column>ePoll number:</Form.Label>
			<Col xs="auto">
				<Form.Control
					className={cn}
					type="search"
					name="EpollNum"
					value={
						isMultiple(ballot.EpollNum) || ballot.EpollNum === null
							? ""
							: ballot.EpollNum
					}
					onChange={(e) =>
						updateBallot({
							EpollNum: e.target.value
								? Number(e.target.value)
								: null,
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
