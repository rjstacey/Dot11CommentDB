import * as React from "react";
import { DateTime } from "luxon";
import { Form, Row, Col } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";

import { isMultiple, Select } from "@common";

import ImatCommitteeSelector from "@/components/ImatCommitteeSelector";
import MeetingSelector from "@/components/MeetingSelector";

import {
	selectBreakoutMeeting,
	selectBreakoutsState,
	SyncedBreakout,
} from "@/store/imatBreakouts";
import type {
	BreakoutEntryMultiple,
	BreakoutEntryPartial,
} from "@/hooks/imatBreakoutsEdit";
import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";

function SlotSelector({
	value,
	onChange,
	isStart,
	...props
}: {
	value: number | null;
	onChange: (value: number) => void;
	isStart?: boolean;
} & Pick<
	React.ComponentProps<typeof Select>,
	| "readOnly"
	| "disabled"
	| "id"
	| "className"
	| "style"
	| "placeholder"
	| "isInvalid"
>) {
	const { timeslots } = useAppSelector(selectBreakoutsState);
	const options = timeslots.map((s) => ({
		value: s.id,
		label: `${s.name} ${isStart ? s.startTime : s.endTime}`,
	}));
	const widthCh = options.reduce(
		(maxCh, o) => Math.max(maxCh, o.label.length),
		12
	);
	const values = options.filter((o) => o.value === value);
	const handleChange = React.useCallback(
		(values: typeof options) =>
			onChange(values.length ? values[0].value : 0),
		[onChange]
	);

	return (
		<Select
			style={{ minWidth: `calc(${widthCh}ch + 30px)` }}
			options={options}
			values={values}
			onChange={handleChange}
			{...props}
		/>
	);
}

const StartSlotSelector = (props: React.ComponentProps<typeof SlotSelector>) =>
	SlotSelector({ ...props, isStart: true });
const EndSlotSelector = SlotSelector;

function SessionDaySelector({
	value,
	onChange,
	...props
}: {
	value: number | null;
	onChange: (value: number) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "id" | "className" | "style" | "placeholder"
>) {
	const imatMeeting = useAppSelector(selectBreakoutMeeting)!;

	const options = React.useMemo(() => {
		const sessionStart = DateTime.fromISO(imatMeeting.start);
		const days =
			Math.floor(
				DateTime.fromISO(imatMeeting.end).diff(sessionStart, "days")
					.days
			) + 1;
		const options = Array.from({ length: days }, (_, i) => ({
			value: i,
			label: sessionStart.plus({ days: i }).toFormat("EEE, d LLL yyyy"),
		}));
		return options;
	}, [imatMeeting]);

	const widthCh = options.reduce(
		(maxCh, o) => Math.max(maxCh, o.label.length),
		12
	);

	const values = options.filter((o) => o.value === value);

	const handleChange = React.useCallback(
		(values: typeof options) =>
			onChange(values.length ? values[0].value : 0),
		[onChange]
	);

	return (
		<Select
			style={{ minWidth: `calc(${widthCh}ch + 30px)` }}
			options={options}
			values={values}
			onChange={handleChange}
			{...props}
		/>
	);
}

function GroupIdSelector({
	value,
	onChange,
	...props
}: {
	value: number | null;
	onChange: (value: number) => void;
} & Pick<
	React.ComponentProps<typeof ImatCommitteeSelector>,
	| "id"
	| "readOnly"
	| "disabled"
	| "className"
	| "style"
	| "placeholder"
	| "isInvalid"
>) {
	const { committees } = useAppSelector(selectBreakoutsState);
	const committee = committees.find((c) => c.id === value);
	function handleChange(symbol: string | null) {
		const committee = committees.find((c) => c.symbol === symbol);
		onChange(committee ? committee.id : 0);
	}
	return (
		<ImatCommitteeSelector
			value={committee ? committee.symbol : ""}
			onChange={handleChange}
			{...props}
		/>
	);
}

function AssociatedMeetingSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<React.ComponentProps<typeof MeetingSelector>, "value" | "onChange">) {
	const imatMeeting = useAppSelector(selectBreakoutMeeting);

	function handleChange(v: number | null) {
		if (v !== value) onChange(v);
	}

	return (
		<MeetingSelector
			value={value}
			onChange={handleChange}
			fromDate={imatMeeting?.start}
			toDate={imatMeeting?.end}
			{...otherProps}
		/>
	);
}

export function BreakoutCredit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: BreakoutEntryMultiple;
	changeEntry: (changes: BreakoutEntryPartial) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Row className="mb-3">
				<Col>
					<Form.Label as="span">Credit:</Form.Label>
				</Col>
				<Col xs="auto" className="d-flex">
					<Form.Check
						className="me-3"
						type="radio"
						id="extra"
						value="Extra"
						checked={entry.credit === "Extra"}
						//indeterminate={isMultiple(entry.credit).toString()}
						onChange={(e) =>
							changeEntry({ credit: e.target.value })
						}
						readOnly={readOnly}
						label="Extra"
					/>
					<Form.Check
						className="me-3"
						type="radio"
						id="normal"
						value="Normal"
						checked={entry.credit === "Normal"}
						//indeterminate={isMultiple(entry.credit).toString()}
						onChange={(e) =>
							changeEntry({ credit: e.target.value })
						}
						readOnly={readOnly}
						label="Normal"
					/>
					<Form.Check
						className="me-3"
						type="radio"
						id="other"
						value="Other"
						checked={entry.credit === "Other"}
						//indeterminate={isMultiple(entry.credit).toString()}
						onChange={(e) =>
							changeEntry({ credit: e.target.value })
						}
						readOnly={readOnly}
						label="Other"
					/>
					<Form.Check
						className="me-3"
						type="radio"
						id="zero"
						value="Zero"
						checked={entry.credit === "Zero"}
						//indeterminate={isMultiple(entry.credit).toString()}
						onChange={(e) =>
							changeEntry({ credit: e.target.value })
						}
						readOnly={readOnly}
						label="Zero"
					/>
				</Col>
			</Row>
			<Row className="align-items-center mb-3">
				<Col>
					<Form.Label as="span">
						Other credit (numerator / denominator):
					</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						type="text"
						name="numerator"
						htmlSize={4}
						value={
							isMultiple(entry.creditOverrideNumerator)
								? ""
								: entry.creditOverrideNumerator || ""
						}
						onChange={(e) =>
							changeEntry({
								creditOverrideNumerator: Number(e.target.value),
							})
						}
						disabled={entry.credit !== "Other" || readOnly}
						placeholder={
							isMultiple(entry.creditOverrideNumerator)
								? MULTIPLE_STR
								: undefined
						}
					/>
				</Col>
				<Col xs="auto">
					<span>/</span>
				</Col>
				<Col xs="auto">
					<Form.Control
						type="text"
						name="denominator"
						htmlSize={4}
						value={
							isMultiple(entry.creditOverrideDenominator)
								? ""
								: entry.creditOverrideDenominator || ""
						}
						onChange={(e) =>
							changeEntry({
								creditOverrideDenominator: Number(
									e.target.value
								),
							})
						}
						disabled={entry.credit !== "Other" || readOnly}
						placeholder={
							isMultiple(entry.creditOverrideDenominator)
								? MULTIPLE_STR
								: undefined
						}
					/>
				</Col>
			</Row>
		</>
	);
}

export function BreakoutEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: SyncedBreakout | BreakoutEntryMultiple;
	changeEntry: (changes: BreakoutEntryPartial) => void;
	readOnly?: boolean;
}) {
	const { timeslots } = useAppSelector(selectBreakoutsState);

	function handleChange(changes: BreakoutEntryPartial) {
		changes = { ...changes };
		if ("startSlotId" in changes) {
			const slot = timeslots.find(
				(slot) => slot.id === changes.startSlotId
			);
			if (slot) {
				changes.startTime = "";
				changes.endSlotId = changes.startSlotId;
				changes.endTime = "";
			}
		}
		if ("endSlotId" in changes) {
			const slot = timeslots.find(
				(slot) => slot.id === changes.endSlotId
			);
			if (slot) changes.endTime = "";
		}
		changeEntry(changes);
	}

	return (
		<>
			<Form.Group as={Row} className="align-items-center mb-3">
				<Col>
					<Form.Label htmlFor="meeting-name">
						Meeting name:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="meeting-name"
						type="text"
						value={isMultiple(entry.name) ? "" : entry.name}
						onChange={(e) => handleChange({ name: e.target.value })}
						placeholder={
							isMultiple(entry.name) ? MULTIPLE_STR : BLANK_STR
						}
						readOnly={readOnly}
						isInvalid={!entry.name}
					/>
					<Form.Control.Feedback type="invalid">
						Enter meeting name
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="group-id">Group:</Form.Label>
				</Col>
				<Col xs="auto">
					<GroupIdSelector
						id="group-id"
						value={isMultiple(entry.groupId) ? null : entry.groupId}
						onChange={(groupId) => handleChange({ groupId })}
						placeholder={
							isMultiple(entry.groupId) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly}
						isInvalid={!entry.groupId}
					/>
					<Form.Control.Feedback type="invalid">
						Select group
					</Form.Control.Feedback>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="session-day">Session day:</Form.Label>
				</Col>
				<Col xs="auto">
					<SessionDaySelector
						id="session-day"
						value={isMultiple(entry.day) ? null : entry.day}
						onChange={(day) => handleChange({ day })}
						placeholder={
							isMultiple(entry.day) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly}
					/>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="start-slot">Start slot:</Form.Label>
				</Col>
				<Col xs="auto">
					<StartSlotSelector
						id="start-slot"
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
						isInvalid={!entry.startSlotId}
					/>
					<Form.Control.Feedback type="invalid">
						Select start slot
					</Form.Control.Feedback>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="start-time">
						Override start time:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="start-time"
						type="time"
						value={
							isMultiple(entry.startTime) ? "" : entry.startTime
						}
						onChange={(e) =>
							handleChange({ startTime: e.target.value })
						}
						placeholder={
							isMultiple(entry.startTime)
								? MULTIPLE_STR
								: "No override"
						}
						readOnly={readOnly}
					/>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="end-slot">End slot:</Form.Label>
				</Col>
				<Col xs="auto">
					<EndSlotSelector
						id="end-slot"
						value={
							isMultiple(entry.endSlotId) ? null : entry.endSlotId
						}
						onChange={(endSlotId) => handleChange({ endSlotId })}
						placeholder={
							isMultiple(entry.endSlotId)
								? MULTIPLE_STR
								: undefined
						}
						readOnly={readOnly}
						isInvalid={!entry.endSlotId}
					/>
					<Form.Control.Feedback type="invalid">
						Select end slot
					</Form.Control.Feedback>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="end-time">
						Override end time:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="end-time"
						type="time"
						value={isMultiple(entry.endTime) ? "" : entry.endTime}
						onChange={(e) =>
							handleChange({ endTime: e.target.value })
						}
						placeholder={
							isMultiple(entry.endTime)
								? MULTIPLE_STR
								: "No override"
						}
						disabled={readOnly}
					/>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="location">Location/room:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="location"
						type="text"
						value={isMultiple(entry.location) ? "" : entry.location}
						onChange={(e) =>
							handleChange({ location: e.target.value })
						}
						placeholder={
							isMultiple(entry.location)
								? MULTIPLE_STR
								: BLANK_STR
						}
						disabled={readOnly}
					/>
				</Col>
			</Row>
			<BreakoutCredit
				entry={entry}
				changeEntry={handleChange}
				readOnly={readOnly}
			/>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="facilitator">Facilitator:</Form.Label>
				</Col>
				<Col>
					<Form.Control
						id="facilitator"
						type="text"
						value={
							isMultiple(entry.facilitator)
								? ""
								: entry.facilitator
						}
						onChange={(e) =>
							handleChange({ facilitator: e.target.value })
						}
						placeholder={
							isMultiple(entry.facilitator)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="associate-with-meeting">
						Associate with meeting:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<AssociatedMeetingSelector
						id="associate-with-meeting"
						value={
							isMultiple(entry.meetingId) ? null : entry.meetingId
						}
						onChange={(meetingId) => handleChange({ meetingId })}
						placeholder={
							isMultiple(entry.meetingId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Col>
			</Row>
		</>
	);
}
