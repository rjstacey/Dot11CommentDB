import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, Multiple } from "@common";

import { Ballot, BallotChange } from "@/store/ballots";
import { MULTIPLE_STR } from "@/components/constants";

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
	return isNaN(newDate.getTime()) ? null : newDate.toISOString();
}

function BallotDateInput({
	ballot,
	original,
	dataKey,
	updateBallot,
	readOnly,
}: {
	ballot: Multiple<Ballot>;
	original?: Multiple<Ballot>;
	dataKey: "Start" | "End";
	updateBallot: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const [value, setValue] = React.useState<string>(
		isMultiple(ballot[dataKey]) ? "" : dateToShortDate(ballot[dataKey])
	);

	const changeDate: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const { name, value } = e.target;
		setValue(value);
		const dateStr = shortDateToDate(value);
		if (dateStr) updateBallot({ [name]: dateStr });
	};

	const hasChanges = original && original[dataKey] !== ballot[dataKey];
	const cn = hasChanges ? "has-changes" : "";

	return (
		<>
			<Form.Control
				className={cn}
				type="date"
				name={dataKey}
				value={value}
				onChange={changeDate}
				readOnly={readOnly || isMultiple(ballot.id)}
				isInvalid={!isMultiple(ballot[dataKey]) && !value}
			/>
			<Form.Control.Feedback type="invalid" tooltip>
				Enter a date
			</Form.Control.Feedback>
			{hasChanges && (
				<Form.Text>
					{isMultiple(original[dataKey])
						? MULTIPLE_STR
						: new Date(original[dataKey] || "").toLocaleDateString(
								"en-US",
								{ timeZone: "America/New_York" }
						  )}
				</Form.Text>
			)}
		</>
	);
}

export function BallotDatesRows({
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
	return (
		<>
			<Form.Group as={Row} controlId="ballot-start" className="mb-2">
				<Form.Label column>Open Date:</Form.Label>
				<Col xs="auto">
					<BallotDateInput
						ballot={ballot}
						original={original}
						dataKey="Start"
						updateBallot={updateBallot}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="ballot-end" className="mb-2">
				<Form.Label column>Close Date:</Form.Label>
				<Col xs="auto" className="position-relative">
					<BallotDateInput
						ballot={ballot}
						original={original}
						dataKey="End"
						updateBallot={updateBallot}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}
