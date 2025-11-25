import { Form, Row, Col } from "react-bootstrap";
import { isMultiple, MULTIPLE } from "@common";

import { SessionAttendanceSummaryChange } from "@/store/attendanceSummaries";

import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";
import { hasChangesStyle } from "@/components/utils";

import type { MultipleSessionAttendanceSummary } from "./useMemberAttendanceEdit";

function renderAttendancePercentage(pct: typeof MULTIPLE | null | number) {
	return isMultiple(pct) ? (
		<i>{MULTIPLE_STR}</i>
	) : pct === null ? (
		<i>{BLANK_STR}</i>
	) : (
		pct.toFixed(1) + "%"
	);
}

function setIndeterminate(
	ref: HTMLInputElement | null,
	value: boolean | typeof MULTIPLE | null
) {
	if (ref) ref.indeterminate = isMultiple(value) ? true : false;
}

export function AttendanceInfoEdit({
	edited,
	saved,
	onChange,
}: {
	edited: MultipleSessionAttendanceSummary;
	saved: MultipleSessionAttendanceSummary;
	onChange: (changes: SessionAttendanceSummaryChange) => void;
}) {
	function AttendanceCheck({
		dataKey,
		label,
	}: {
		dataKey: "IsRegistered" | "InPerson" | "DidAttend" | "DidNotAttend";
		label: string;
	}) {
		const id = "attendance-" + dataKey;
		return (
			<Form.Check
				key={id}
				id={id}
				style={hasChangesStyle(edited, saved, dataKey)}
				checked={!!edited[dataKey]}
				ref={(ref) => setIndeterminate(ref, edited[dataKey])}
				onChange={(e) =>
					onChange({
						[dataKey]: e.target.checked,
					})
				}
				label={label}
			/>
		);
	}

	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label as="span">Session registration:</Form.Label>
				</Col>
				<Col xs={12} md={8}>
					<AttendanceCheck
						dataKey="IsRegistered"
						label="Registered"
					/>
					<AttendanceCheck dataKey="InPerson" label="In-person" />
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label as="span">Attendance percentage:</Form.Label>
				</Col>
				<Col xs={12} md={8}>
					{renderAttendancePercentage(edited.AttendancePercentage)}
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label as="span">Attendance override:</Form.Label>
				</Col>
				<Col xs={12} md={8}>
					<AttendanceCheck dataKey="DidAttend" label="Did attend" />
					<AttendanceCheck
						dataKey="DidNotAttend"
						label="Did not attend"
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label as="span">Attendance notes:</Form.Label>
				</Col>
				<Col xs={12} md={8}>
					<Form.Control
						type="text"
						id="attendance-notes"
						style={hasChangesStyle(edited, saved, "Notes")}
						value={
							(!isMultiple(edited.Notes) && edited.Notes) || ""
						}
						onChange={(e) => onChange({ Notes: e.target.value })}
						placeholder={
							isMultiple(edited.Notes) ? MULTIPLE_STR : BLANK_STR
						}
					/>
				</Col>
			</Form.Group>
		</>
	);
}
