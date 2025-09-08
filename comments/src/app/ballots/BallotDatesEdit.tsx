import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange } from "@/store/ballots";

/* Convert an ISO date string to US eastern time and return string in form "YYYY-MM-DD" */
function dateToShortDate(isoDate: string | null) {
	if (!isoDate) return "";
	const utcDate = new Date(isoDate);
	const date = new Date(
		utcDate.toLocaleString("en-US", { timeZone: "America/New_York" })
	);
	return (
		date.getFullYear() +
		"-" +
		("0" + (date.getMonth() + 1)).slice(-2) +
		"-" +
		("0" + date.getDate()).slice(-2)
	);
}

/* Parse date in form "YYYY-MM-DD" as US eastern time and convert to UTC ISO date string */
function shortDateToDate(shortDateStr: string) {
	const date = new Date(shortDateStr); // local time
	const easternDate = new Date(
		date.toLocaleString("en-US", { timeZone: "America/New_York" })
	);
	const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
	const diff = utcDate.getTime() - easternDate.getTime();
	const newDate = new Date(date.getTime() + diff);
	return isNaN(newDate.getTime()) ? "" : newDate.toISOString();
}

function BallotDatesEdit({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const changeDate: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const { name, value } = e.target;
		const dateStr = shortDateToDate(value);
		updateBallot({ [name]: dateStr });
	};

	return (
		<Row style={{ flexWrap: "wrap" }}>
			<Form.Group as={Row} controlId="Start">
				<Form.Label column>Open Date:</Form.Label>
				<Col>
					<Form.Control
						type="date"
						name="Start"
						value={
							isMultiple(ballot.Start)
								? ""
								: dateToShortDate(ballot.Start)
						}
						onChange={changeDate}
						disabled={readOnly || isMultiple(ballot.id)}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="End">
				<Form.Label column>Close Date:</Form.Label>
				<Col>
					<Form.Control
						type="date"
						name="End"
						value={
							isMultiple(ballot.End)
								? ""
								: dateToShortDate(ballot.End)
						}
						onChange={changeDate}
						disabled={readOnly || isMultiple(ballot.id)}
					/>
				</Col>
			</Form.Group>
		</Row>
	);
}

export default BallotDatesEdit;
