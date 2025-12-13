import * as React from "react";
import { Form, Row, Col } from "react-bootstrap";
import { Select, isMultiple, Multiple, InputDates, InputTime } from "@common";

import { getSessionDates, type Session } from "@/store/sessions";
import type {
	MeetingEntryMultiple,
	MeetingEntryPartial,
} from "@/edit/convertMeetingEntry";
import { MULTIPLE_STR } from "@/components/constants";
import TimeZoneSelector from "@/components/TimeZoneSelector";

function SessionDateSelector({
	value,
	onChange,
	session,
	...props
}: {
	value: string | null;
	onChange: (date: string | null) => void;
	session: Session;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "style" | "className"
>) {
	const options = getSessionDates(session).map((date) => ({
		value: date,
		label: date,
	}));
	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].value : null);
	const values = options.filter((d) => d.value === value);
	return (
		<Select
			options={options}
			values={values}
			onChange={handleChange}
			{...props}
		/>
	);
}

function TimeslotSelector({
	value,
	onChange,
	session,
	...props
}: {
	value: number | null;
	onChange: (value: number | null) => void;
	session: Session;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "style" | "className"
>) {
	const timeslots = session.timeslots;
	const handleChange = (values: typeof timeslots) =>
		onChange(values.length > 0 ? values[0].id : null);
	const values = timeslots.filter((slot) => slot.id === value);
	return (
		<Select
			options={timeslots}
			values={values}
			onChange={handleChange}
			labelField="name"
			valueField="id"
			{...props}
		/>
	);
}

type MeetingTime = {
	dates: string[];
	startSlotId: number | null;
	startTime: string;
	endTime: string;
};

function SessionMeetingTime({
	entry,
	changeEntry,
	session,
	readOnly,
}: {
	entry: Multiple<MeetingTime>;
	changeEntry: (changes: Partial<MeetingTime>) => void;
	session: Session;
	readOnly?: boolean;
}) {
	function handleChange(changes: MeetingEntryPartial) {
		changes = { ...changes };
		if ("startSlotId" in changes) {
			const slot = session.timeslots.find(
				(slot) => slot.id === changes.startSlotId
			);
			if (slot) {
				changes.startTime = slot.startTime;
				changes.endTime = slot.endTime;
			}
		}
		changeEntry(changes);
	}

	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-session-day">
						Session day:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<SessionDateSelector
						id="meeting-session-day"
						session={session}
						value={entry.dates.length === 1 ? entry.dates[0] : ""}
						onChange={(date) =>
							changeEntry({ dates: date ? [date] : [] })
						}
						placeholder={
							entry.dates.length > 1 ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-start-slot">
						Start slot:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<TimeslotSelector
						id="meeting-start-slot"
						session={session}
						value={
							isMultiple(entry.startSlotId)
								? null
								: entry.startSlotId
						}
						onChange={(startSlotId) =>
							handleChange({ startSlotId })
						}
						placeholder={
							isMultiple(entry.startSlotId)
								? MULTIPLE_STR
								: undefined
						}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-start-time">
						Start time:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<InputTime
						id="meeting-start-time"
						value={
							isMultiple(entry.startTime) ? "" : entry.startTime
						}
						onChange={(startTime) => changeEntry({ startTime })}
						placeholder={
							isMultiple(entry.startTime)
								? MULTIPLE_STR
								: undefined
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-end-time">
						End time:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<InputTime
						id="meeting-end-time"
						value={isMultiple(entry.endTime) ? "" : entry.endTime}
						onChange={(endTime) => changeEntry({ endTime })}
						placeholder={
							isMultiple(entry.endTime) ? MULTIPLE_STR : undefined
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}

type TeleconTime = {
	timezone: string;
	dates: string[];
	startTime: string;
	duration: string;
};

function TeleconMeetingTime({
	action,
	entry,
	changeEntry,
	readOnly,
}: {
	action: "add" | "update";
	entry: Multiple<TeleconTime>;
	changeEntry: (changes: Partial<TeleconTime>) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Form.Label htmlFor="meeting-timezone" column>
					Time zone:
				</Form.Label>
				<Col xs="auto">
					<TimeZoneSelector
						id="meeting-timezone"
						style={{ width: 250 }}
						value={
							isMultiple(entry.timezone)
								? ""
								: entry.timezone || ""
						}
						onChange={(timezone) => changeEntry({ timezone })}
						placeholder={
							isMultiple(entry.timezone)
								? MULTIPLE_STR
								: undefined
						}
						readOnly={readOnly}
						isInvalid={!entry.timezone}
					/>
					<Form.Control.Feedback type="invalid">
						{"Enter time zone"}
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-dates">
						{action === "add" ? "Dates" : "Date"}:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<InputDates
						id="meeting-dates"
						disablePast
						multi={action === "add"}
						value={isMultiple(entry.dates) ? [] : entry.dates}
						onChange={(dates) => changeEntry({ dates })}
						placeholder={
							isMultiple(entry.dates) ? MULTIPLE_STR : undefined
						}
						disabled={readOnly}
						//isInvalid={entry.dates.length === 0}
					/>
					<Form.Control.Feedback type="invalid">
						{"Enter date(s)"}
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group
				as={Row}
				className="mb-3"
				controlId="meeting-start-time"
			>
				<Form.Label column>Start time:</Form.Label>
				<Col xs="auto">
					<InputTime
						value={
							isMultiple(entry.startTime) ? "" : entry.startTime
						}
						onChange={(startTime) => changeEntry({ startTime })}
						placeholder={
							isMultiple(entry.startTime)
								? MULTIPLE_STR
								: undefined
						}
						disabled={readOnly}
						isInvalid={!entry.startTime}
					/>
					<Form.Control.Feedback type="invalid">
						{"Enter start time"}
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3" controlId="meeting-duration">
				<Form.Label column>Duration:</Form.Label>
				<Col xs="auto">
					<Form.Control
						type="text"
						value={isMultiple(entry.duration) ? "" : entry.duration}
						onChange={(e) =>
							changeEntry({ duration: e.target.value })
						}
						disabled={readOnly}
						placeholder={
							isMultiple(entry.duration)
								? MULTIPLE_STR
								: "H or H:mm"
						}
					/>
				</Col>
			</Form.Group>
		</>
	);
}

export function MeetingsTimeEdit({
	action,
	entry,
	changeEntry,
	session,
	readOnly,
}: {
	action: "add" | "update";
	entry: MeetingEntryMultiple;
	changeEntry: (changes: MeetingEntryPartial) => void;
	session: Session;
	readOnly?: boolean;
}) {
	if (entry.isSessionMeeting) {
		return (
			<SessionMeetingTime
				entry={entry}
				session={session}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
		);
	} else {
		return (
			<TeleconMeetingTime
				action={action === "update" ? "update" : "add"}
				entry={entry}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
		);
	}
}
