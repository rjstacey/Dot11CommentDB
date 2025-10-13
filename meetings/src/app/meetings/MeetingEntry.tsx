import * as React from "react";
import { Duration } from "luxon";
import { Form, Row, Col, Button } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Select, isMultiple, Multiple, setError } from "@common";
import { InputDates, InputTime } from "@common";

import {
	selectCurrentSession,
	selectCurrentSessionDates,
} from "@/store/sessions";

import { selectGroupEntities } from "@/store/groups";

import TimeZoneSelector from "@/components/TimeZoneSelector";
import { SubgroupSelector } from "@/components/SubgroupSelector";
import CalendarAccountSelector from "@/components/CalendarAccountSelector";
import ImatMeetingSelector from "@/components/ImatMeetingSelector";

import {
	WebexMeetingAccount,
	WebexMeetingParamsEdit,
} from "../webexMeetings/WebexMeetingDetail";
import { PartialWebexMeetingEntry } from "../webexMeetings/convertWebexMeetingEntry";
import {
	isSessionMeeting,
	type MultipleMeetingEntry,
	type PartialMeetingEntry,
} from "./convertMeetingEntry";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

const MULTIPLE_STR = "(Multiple)";
const BLANK_STR = "(Blank)";

function validDuration(duration: string) {
	if (!duration) return false;
	const d = duration.trim();
	const m = /^(\d*):(\d{2})$/.exec(d);
	try {
		const dt = Duration.fromObject(
			m
				? { hours: m[1] ? Number(m[1]) : 0, minutes: Number(m[2]) }
				: { hours: Number(d) }
		);
		return dt.isValid;
	} catch {
		return false;
	}
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
			<Form.Group as={Row} className="mb-3" controlId="meeting-dates">
				<Form.Label column>
					Date{action === "add" ? "s" : ""}:
				</Form.Label>
				<Col xs="auto">
					<InputDates
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

const gracePeriodOptions = [
	{ value: 0, label: "None" },
	{ value: 5, label: "5 min" },
	{ value: 10, label: "10 min" },
];

function GracePeriodSelector({
	value,
	onChange,
	...props
}: {
	value: number | null;
	onChange: (value: number) => void;
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
	let options = gracePeriodOptions;
	let values = options.filter((o) => o.value === value);
	if (values.length === 0 && value !== null) {
		const option = { value, label: `${value} min` };
		options = options.concat([option]);
		values = [option];
	}

	const handleChange = React.useCallback(
		(values: typeof gracePeriodOptions) =>
			onChange(values.length ? values[0].value : 0),
		[onChange]
	);

	return (
		<Select
			options={options}
			values={values}
			onChange={handleChange}
			{...props}
		/>
	);
}

function SessionDateSelector({
	value,
	onChange,
	...props
}: {
	value: string | null;
	onChange: (date: string | null) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "style" | "className"
>) {
	const options = useAppSelector(selectCurrentSessionDates).map((date) => ({
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
	...props
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "style" | "className"
>) {
	const timeslots = useAppSelector(selectCurrentSession)?.timeslots || [];
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

function RoomSelector({
	value,
	onChange,
	...props
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "style" | "className"
>) {
	const rooms = useAppSelector(selectCurrentSession)?.rooms || [];
	const handleChange = (values: typeof rooms) =>
		onChange(values.length > 0 ? values[0].id : null);
	const values = rooms.filter((room) => room.id === value);
	return (
		<Select
			options={rooms}
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
	readOnly,
}: {
	entry: Multiple<MeetingTime>;
	changeEntry: (changes: Partial<MeetingTime>) => void;
	readOnly?: boolean;
}) {
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
						value={
							isMultiple(entry.startSlotId)
								? null
								: entry.startSlotId
						}
						onChange={(startSlotId) => changeEntry({ startSlotId })}
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

export function MeetingEntryForm({
	entry,
	changeEntry,
	action,
	submit,
	cancel,
	readOnly,
}: {
	entry: MultipleMeetingEntry;
	changeEntry: (changes: PartialMeetingEntry) => void;
	action: "add-by-slot" | "add-by-date" | "update";
	busy?: boolean;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const session = useAppSelector(selectCurrentSession);
	const groupEntities = useAppSelector(selectGroupEntities);

	const isSession = isSessionMeeting(session);

	let errMsg = "";
	if (!entry.organizationId) errMsg = "Group not set";
	else if (entry.dates.length === 0) errMsg = "Date not set";
	else if (!entry.startTime) errMsg = "Start time not set";
	else if (isSession && !entry.endTime) errMsg = "End time not set";
	else if (!isSession && !validDuration(entry.duration))
		errMsg = "Duration not set";
	else if (!entry.timezone) errMsg = "Time zone not set";

	let submitForm, submitLabel;
	if (submit) {
		if (action === "add-by-slot") {
			submitLabel = "Add";
		} else if (action === "add-by-date") {
			submitLabel = "Add";
		} else {
			submitLabel = "Update";
		}
		submitForm = (e: React.ChangeEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (errMsg) {
				dispatch(setError("Fix error", errMsg));
				return;
			}
			submit();
		};
	}

	function handleChange(changes: PartialMeetingEntry) {
		changes = { ...changes };
		if ("organizationId" in changes) {
			const subgroup =
				changes.organizationId && groupEntities[changes.organizationId];
			if (subgroup) changes.summary = subgroup.name;
		}
		if ("startSlotId" in changes) {
			const slot = session?.timeslots.find(
				(slot) => slot.id === changes.startSlotId
			);
			if (slot) {
				changes.startTime = slot.startTime;
				changes.endTime = slot.endTime;
			}
		}
		if ("roomId" in changes) {
			changes.location = "";
		}
		changeEntry(changes);
	}

	function handleWebexMeetingChange(
		webexMeetingChanges: PartialWebexMeetingEntry
	) {
		const changes: PartialMeetingEntry = {
			webexMeeting: webexMeetingChanges,
		};
		if ("accountId" in webexMeetingChanges)
			changes.webexAccountId = webexMeetingChanges.accountId;
		handleChange(changes);
	}

	return (
		<Form onSubmit={submitForm} className="p-3">
			{action === "update" && (
				<Form.Group
					as={Row}
					className="mb-3"
					controlId="meeting-cancel"
				>
					<Col className="d-flex justify-content-end align-items-center">
						<Button
							variant="outline-danger"
							active={
								!isMultiple(entry.isCancelled) &&
								entry.isCancelled
							}
							onClick={() =>
								handleChange({
									isCancelled: !entry.isCancelled,
								})
							}
							disabled={isMultiple(entry.isCancelled) || readOnly}
							title="Mark the meeting as cancelled"
						>
							{entry.isCancelled ? "Cancelled" : "Cancel Meeting"}
						</Button>
					</Col>
				</Form.Group>
			)}
			<Form.Group as={Row} className="mb-3">
				<Form.Label htmlFor="meeting-subgroup" column>
					Subgroup:
				</Form.Label>
				<Col xs="auto">
					<SubgroupSelector
						id="meeting-subgroup"
						style={{ minWidth: 200 }}
						value={
							isMultiple(entry.organizationId)
								? ""
								: entry.organizationId || ""
						}
						onChange={(organizationId) =>
							handleChange({ organizationId })
						}
						placeholder={
							isMultiple(entry.organizationId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
						isInvalid={!entry.organizationId}
					/>
					<Form.Control.Feedback type="invalid">
						{"Enter subgroup"}
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-summary">Summary:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="meeting-summary"
						type="search"
						style={{ width: 200 }}
						value={
							isMultiple(entry.summary) ? "" : entry.summary || ""
						}
						onChange={(e) =>
							handleChange({ summary: e.target.value })
						}
						placeholder={
							isMultiple(entry.summary) ? MULTIPLE_STR : BLANK_STR
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			{action !== "add-by-slot" &&
				(isSession ? (
					<SessionMeetingTime
						entry={entry}
						changeEntry={handleChange}
						readOnly={readOnly}
					/>
				) : (
					<TeleconMeetingTime
						action={action === "update" ? "update" : "add"}
						entry={entry}
						changeEntry={handleChange}
						readOnly={readOnly}
					/>
				))}

			{action !== "add-by-slot" && (
				<Form.Group as={Row} className="mb-3">
					<Form.Label htmlFor="meeting-location" column>
						Location:
					</Form.Label>
					<Col xs="auto">
						{isSession ? (
							<RoomSelector
								id="meeting-location"
								value={
									isMultiple(entry.roomId)
										? null
										: entry.roomId
								}
								onChange={(roomId) => handleChange({ roomId })}
								placeholder={
									isMultiple(entry.roomId)
										? MULTIPLE_STR
										: BLANK_STR
								}
								readOnly={readOnly}
							/>
						) : (
							<Form.Control
								id="meeting-location"
								type="search"
								style={{ width: 200 }}
								value={
									isMultiple(entry.location)
										? ""
										: entry.location || ""
								}
								onChange={(e) =>
									handleChange({
										location: e.target.value,
									})
								}
								placeholder={
									isMultiple(entry.location)
										? MULTIPLE_STR
										: BLANK_STR
								}
								disabled={readOnly}
							/>
						)}
					</Col>
				</Form.Group>
			)}
			{!isSession && (
				<Form.Group as={Row} className="mb-3">
					<Col>
						<Form.Label htmlFor="meeting-includes-motions">
							Agenda includes motions:
						</Form.Label>
					</Col>
					<Col xs="auto">
						<Form.Check
							id="meeting-includes-motions"
							type="checkbox"
							checked={
								isMultiple(entry.hasMotions)
									? false
									: entry.hasMotions
							}
							ref={(ref) => {
								if (ref)
									ref.indeterminate = isMultiple(
										entry.hasMotions
									);
							}}
							onChange={(e) =>
								handleChange({
									hasMotions: e.target.checked,
								})
							}
							disabled={readOnly}
						/>
					</Col>
				</Form.Group>
			)}
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-imat-grace-period">
						IMAT grace period:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<GracePeriodSelector
						id="meeting-imat-grace-period"
						//style={{ width: 200 }}
						value={
							isMultiple(entry.imatGracePeriod)
								? null
								: entry.imatGracePeriod
						}
						onChange={(imatGracePeriod) =>
							handleChange({ imatGracePeriod })
						}
						placeholder={
							isMultiple(entry.imatGracePeriod)
								? MULTIPLE_STR
								: BLANK_STR
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-imat-meeting">
						IMAT meeting:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<ImatMeetingSelector
						id="meeting-imat-meeting"
						value={
							isMultiple(entry.imatMeetingId)
								? null
								: entry.imatMeetingId
						}
						onChange={(imatMeetingId) =>
							handleChange({ imatMeetingId })
						}
						placeholder={
							isMultiple(entry.imatMeetingId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<WebexMeetingAccount
				entry={
					entry.webexMeeting
						? entry.webexMeeting
						: { accountId: entry.webexAccountId }
				}
				changeEntry={handleWebexMeetingChange}
				readOnly={readOnly}
			/>
			{entry.webexMeeting && entry.webexMeeting.accountId ? (
				<WebexMeetingParamsEdit
					entry={entry.webexMeeting}
					changeEntry={handleWebexMeetingChange}
					readOnly={readOnly}
				/>
			) : null}
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-calendar">
						Calendar:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<CalendarAccountSelector
						id="meeting-calendar"
						value={
							isMultiple(entry.calendarAccountId)
								? null
								: entry.calendarAccountId
						}
						onChange={(calendarAccountId) =>
							handleChange({ calendarAccountId })
						}
						placeholder={
							isMultiple(entry.calendarAccountId)
								? MULTIPLE_STR
								: undefined
						}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			{submit && (
				<SubmitCancelRow submitLabel={submitLabel} cancel={cancel} />
			)}
		</Form>
	);
}

export default MeetingEntryForm;
