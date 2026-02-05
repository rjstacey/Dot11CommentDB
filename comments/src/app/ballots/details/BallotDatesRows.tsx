import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple } from "@common";

import type { BallotCreate, BallotChange } from "@/store/ballots";
import type { BallotMultiple } from "@/hooks/ballotsEdit";
import { MULTIPLE_STR } from "@/components/constants";

/* Convert an ISO date string to US eastern time and return string in form "YYYY-MM-DD" */
function dateToShortDate(isoDate: string | null) {
	if (!isoDate) return "";
	const utcDate = new Date(isoDate);
	const date = new Date(
		utcDate.toLocaleString("en-US", { timeZone: "America/New_York" }),
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
		date.toLocaleString("en-US", { timeZone: "America/New_York" }),
	);
	const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
	const diff = utcDate.getTime() - easternDate.getTime();
	const newDate = new Date(date.getTime() + diff);
	return isNaN(newDate.getTime()) ? null : newDate.toISOString();
}

function BallotDateInput({
	edited,
	saved,
	dataKey,
	onChange,
	readOnly,
}: {
	edited: BallotCreate | BallotMultiple;
	saved?: BallotMultiple;
	dataKey: "Start" | "End";
	onChange: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	const value = isMultiple(edited[dataKey])
		? ""
		: dateToShortDate(edited[dataKey]);

	const changeDate: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const { name, value } = e.target;
		const dateStr = shortDateToDate(value);
		if (dateStr) onChange({ [name]: dateStr });
	};

	const hasChanges = saved && saved[dataKey] !== edited[dataKey];
	const cn = hasChanges ? "has-changes" : "";

	return (
		<>
			<Form.Control
				className={cn}
				type="date"
				name={dataKey}
				value={value}
				onChange={changeDate}
				readOnly={readOnly || ("id" in edited && isMultiple(edited.id))}
				isInvalid={!isMultiple(edited[dataKey]) && !value}
			/>
			<Form.Control.Feedback type="invalid" tooltip>
				Enter a date
			</Form.Control.Feedback>
			{hasChanges && (
				<Form.Text>
					{isMultiple(saved[dataKey])
						? MULTIPLE_STR
						: new Date(saved[dataKey] || "").toLocaleDateString(
								"en-US",
								{ timeZone: "America/New_York" },
							)}
				</Form.Text>
			)}
		</>
	);
}

export function BallotDatesRows({
	edited,
	saved,
	onChange,
	readOnly,
}: {
	edited: BallotCreate | BallotMultiple;
	saved?: BallotMultiple;
	onChange: (changes: BallotChange) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Form.Group as={Row} controlId="ballot-start" className="mb-2">
				<Form.Label column>Open Date:</Form.Label>
				<Col xs="auto">
					<BallotDateInput
						edited={edited}
						saved={saved}
						dataKey="Start"
						onChange={onChange}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="ballot-end" className="mb-2">
				<Form.Label column>Close Date:</Form.Label>
				<Col xs="auto" className="position-relative">
					<BallotDateInput
						edited={edited}
						saved={saved}
						dataKey="End"
						onChange={onChange}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}
