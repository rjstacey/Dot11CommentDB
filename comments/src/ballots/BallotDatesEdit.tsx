import React from "react";
import { Row, Input, isMultiple, Multiple, FieldLeft } from "dot11-components";

import { Ballot, BallotChange } from "../store/ballots";

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
	let newDate = new Date(date.getTime() + diff);
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
			<Row>
				<FieldLeft label="Open Date:">
					<Input
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
				</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label="Close Date:">
					<Input
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
				</FieldLeft>
			</Row>
		</Row>
	);
}

export default BallotDatesEdit;
