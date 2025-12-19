import * as React from "react";
import { DateTime } from "luxon";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, TextArea, Select } from "@common";

import TimeZoneSelector from "@/components/TimeZoneSelector";
import ImatMeetingSelector from "@/components/ImatMeetingSelector";
import GroupParentsSelector from "@/components/GroupParentsSelector";

import {
	SessionTypeOptions,
	Session,
	SessionCreate,
	SessionType,
} from "@/store/sessions";
import type { MultipleSession } from "@/hooks/sessionsEdit";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

function SessionTypeSelector({
	value,
	onChange,
	...otherProps
}: {
	value: SessionType | null;
	onChange: (value: SessionType) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "style" | "className"
>) {
	const values = SessionTypeOptions.filter((o) => o.value === value);
	const handleChange = (values: typeof SessionTypeOptions) =>
		onChange(values.length > 0 ? values[0].value : "o");
	return (
		<Select
			values={values}
			options={SessionTypeOptions}
			onChange={handleChange}
			{...otherProps}
		/>
	);
}

export function SessionBasicsEdit({
	session,
	original,
	updateSession,
	readOnly,
}: {
	session: MultipleSession | SessionCreate;
	original?: MultipleSession | SessionCreate;
	updateSession: (changes: Partial<Session>) => void;
	readOnly?: boolean;
}) {
	function handleChange(changes: Partial<Session>) {
		if ("startDate" in changes) {
			const startDate = DateTime.fromISO(changes.startDate!);
			const endDate = DateTime.fromISO(session.endDate);
			if (startDate.isValid) {
				// For plenary and interim sessions, assume ends 5 days later (usually Sun - Fri)
				// otherwise, just make sure end date is later than start date
				if (session.type === "p" || session.type === "i")
					changes.endDate = startDate.plus({ days: 5 }).toISODate()!;
				else if (endDate < startDate)
					changes.endDate = startDate.toISODate()!;
			}
		} else if ("endDate" in changes) {
			// Ensure that the start date is never later than end date
			const endDate = DateTime.fromISO(changes.endDate!);
			const startDate = DateTime.fromISO(session.startDate);
			if (endDate.isValid && endDate < startDate)
				changes.startDate = endDate.toISODate()!;
		}
		updateSession(changes);
	}

	const formGroupClassName = "mb-3" + (readOnly ? " pe-none" : "");

	return (
		<>
			<Form.Group
				as={Row}
				className={formGroupClassName}
				controlId="session-number"
			>
				<Col>
					<Form.Label>Session number:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						type="number"
						style={{ width: "10rem" }}
						name="Number"
						value={
							isMultiple(session.number)
								? ""
								: session.number || ""
						}
						placeholder={
							isMultiple(session.number)
								? MULTIPLE_STR
								: BLANK_STR
						}
						onChange={(e) =>
							handleChange({
								number: e.target.value
									? Number(e.target.value)
									: null,
							})
						}
						min={1}
						step={0.1}
						autoComplete="none"
						readOnly={readOnly}
						tabIndex={readOnly ? -1 : undefined}
						isInvalid={!session.number}
						className={
							original && session.number !== original.number
								? "has-changes"
								: undefined
						}
					/>
					<Form.Control.Feedback type="invalid">
						Enter session number
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className={formGroupClassName}>
				<Col xs="auto">
					<Form.Label htmlFor="session-name">
						Session name:
					</Form.Label>
				</Col>
				<Col>
					<TextArea
						id="session-name"
						name="Name"
						value={isMultiple(session.name) ? "" : session.name}
						placeholder={
							isMultiple(session.name) ? MULTIPLE_STR : BLANK_STR
						}
						onChange={(e) => handleChange({ name: e.target.value })}
						autoComplete="none"
						readOnly={readOnly}
						tabIndex={readOnly ? -1 : undefined}
						className={
							original && session.name !== original.name
								? "has-changes"
								: undefined
						}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className={formGroupClassName}>
				<Col>
					<Form.Label htmlFor="session-type">
						Session type:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<SessionTypeSelector
						id="session-type"
						value={
							!session.type || isMultiple(session.type)
								? null
								: session.type
						}
						onChange={(type) => handleChange({ type })}
						readOnly={readOnly}
						className={
							original && session.type !== original.type
								? "has-changes"
								: undefined
						}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className={formGroupClassName}>
				<Form.Label column htmlFor="session-organizing-group">
					Organizing group:
				</Form.Label>
				<Col xs="auto">
					<GroupParentsSelector
						id="session-organizing-group"
						value={
							isMultiple(session.groupId) ? null : session.groupId
						}
						onChange={(groupId) => handleChange({ groupId })}
						readOnly={readOnly}
						isInvalid={!session.groupId}
						className={
							original && session.groupId !== original.groupId
								? "has-changes"
								: undefined
						}
					/>
					<Form.Control.Feedback type="invalid">
						Select organizing group
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className={formGroupClassName}>
				<Col>
					<Form.Label htmlFor="session-start">Start:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="session-start"
						type="date"
						value={
							isMultiple(session.startDate)
								? ""
								: session.startDate
						}
						onChange={(e) =>
							handleChange({ startDate: e.target.value })
						}
						placeholder={
							isMultiple(session.startDate)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
						tabIndex={readOnly ? -1 : undefined}
						isInvalid={!session.startDate}
						className={
							original && session.startDate !== original.startDate
								? "has-changes"
								: undefined
						}
					/>
					<Form.Control.Feedback type="invalid">
						Enter start date
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className={formGroupClassName}>
				<Col>
					<Form.Label htmlFor="session-end">End:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="session-end"
						type="date"
						value={
							isMultiple(session.endDate) ? "" : session.endDate
						}
						onChange={(e) =>
							handleChange({ endDate: e.target.value })
						}
						placeholder={
							isMultiple(session.endDate)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
						tabIndex={readOnly ? -1 : undefined}
						isInvalid={!session.endDate}
						className={
							original && session.endDate !== original.endDate
								? "has-changes"
								: undefined
						}
					/>
					<Form.Control.Feedback type="invalid">
						Enter end date
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className={formGroupClassName}>
				<Col>
					<Form.Label htmlFor="session-timezone">
						Time zone:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<TimeZoneSelector
						id="session-timezone"
						style={{ width: 250 }}
						value={
							isMultiple(session.timezone) ? "" : session.timezone
						}
						onChange={(timezone) => handleChange({ timezone })}
						placeholder={
							isMultiple(session.timezone)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
						isInvalid={!session.timezone}
						className={
							original && session.timezone !== original.timezone
								? "has-changes"
								: undefined
						}
					/>
					<Form.Control.Feedback type="invalid">
						Select time zone
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className={formGroupClassName}>
				<Col>
					<Form.Label htmlFor="session-imat-meeting">
						IMAT meeting:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<ImatMeetingSelector
						id="session-imat-meeting"
						value={
							isMultiple(session.imatMeetingId)
								? null
								: session.imatMeetingId
						}
						onChange={(imatMeetingId) =>
							handleChange({ imatMeetingId })
						}
						placeholder={
							isMultiple(session.imatMeetingId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
						className={
							original &&
							session.imatMeetingId !== original.imatMeetingId
								? "has-changes"
								: undefined
						}
					/>
				</Col>
			</Form.Group>
		</>
	);
}
