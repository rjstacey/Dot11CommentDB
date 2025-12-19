import * as React from "react";
import { Row, Col, Form } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { Select, isMultiple, Multiple, InputTime } from "@common";

import type {
	WebexMeetingOptions,
	WebexAudioConnectionOptions,
	WebexEntryExitTone,
} from "@/store/webexMeetings";
import { selectCurrentSession } from "@/store/sessions";
import type {
	WebexMeetingEntry,
	WebexMeetingEntryCreate,
} from "@/hooks/convertWebexMeetingEntry";
import {
	defaultWebexMeeting,
	type WebexMeetingEntryPartial,
	type WebexMeetingEntryMultiple,
} from "@/hooks/webexMeetingsEdit";

import WebexAccountSelector from "@/components/WebexAccountSelector";
import TimeZoneSelector from "@/components/TimeZoneSelector";
import InputTimeRangeAsDuration from "@/components/InputTimeRangeAsDuration";
import MeetingSelector from "@/components/MeetingSelector";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";
import { MULTIPLE_STR, BLANK_STR } from "@/components/constants";

export function WebexMeetingAccount({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: Multiple<{ accountId: number | null }>;
	changeEntry: (changes: Partial<WebexMeetingEntry>) => void;
	readOnly?: boolean;
}) {
	function onChange(accountId: number | null) {
		let changes: Partial<WebexMeetingEntry> = { accountId };

		// If account was not previously selected, revert to defaults
		if (!entry.accountId && accountId) {
			changes = {
				...defaultWebexMeeting,
				...changes,
			};
		}

		changeEntry(changes);
	}

	return (
		<Form.Group as={Row} className="mb-3">
			<Form.Label htmlFor="webex-account" column>
				Webex account
			</Form.Label>
			<Col xs="auto">
				<WebexAccountSelector
					id="webex-account"
					value={isMultiple(entry.accountId) ? null : entry.accountId}
					onChange={onChange}
					placeholder={
						isMultiple(entry.accountId) ? MULTIPLE_STR : undefined
					}
					readOnly={readOnly}
					isInvalid={!entry.accountId}
				/>
				<Form.Control.Feedback type="invalid">
					Select a Webex account
				</Form.Control.Feedback>
			</Col>
		</Form.Group>
	);
}

type EntryToneOption = {
	value: WebexEntryExitTone;
	label: string;
};
const entryToneOptions: EntryToneOption[] = [
	{ value: "noTone", label: "No tone" },
	{ value: "beep", label: "Beep" },
	{ value: "announceName", label: "Announce name" },
];

/*
 * Allow `null` as value for the case when MULTIPLE options are present, but don't allow it to be set to `null`
 * through `onChange()`.
 */
function SelectEntryAndExitTone({
	value,
	onChange,
	...props
}: {
	value: WebexEntryExitTone | null;
	onChange: (value: WebexEntryExitTone) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "className" | "style"
>) {
	const values = entryToneOptions.filter((e) => e.value === value);
	if (values.length === 0) onChange(entryToneOptions[0].value);
	const handleChange = (values: typeof entryToneOptions) =>
		onChange(
			values.length > 0 ? values[0].value : entryToneOptions[0].value
		);
	return (
		<Select
			values={values}
			options={entryToneOptions}
			onChange={handleChange}
			{...props}
		/>
	);
}

const joinMinutes = [0, 5, 10, 15];

function SelectJoinBeforeHostMinutes({
	value,
	onChange,
	...props
}: {
	value: number | null | undefined;
	onChange: (value: number) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"readOnly" | "disabled" | "placeholder" | "id" | "className" | "style"
>) {
	const options = joinMinutes.map((value) => ({
		value,
		label: value.toString(),
	}));
	if (typeof value === "number" && !joinMinutes.includes(value))
		options.concat([{ value, label: value.toString() }]);

	const values = options.filter((e) => e.value === value);

	const handleChange = (values: typeof options) =>
		onChange(values.length > 0 ? values[0].value : 0);

	return (
		<Select
			values={values}
			options={options}
			onChange={handleChange}
			{...props}
		/>
	);
}

type WebexMeetingTitleDateTime = {
	title?: string;
	timezone?: string;
	date: string;
	startTime: string;
	endTime: string;
};

function WebexMeetingTitleDateTimeEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: Multiple<WebexMeetingTitleDateTime>;
	changeEntry: (changes: Partial<WebexMeetingTitleDateTime>) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="title">Title:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						id="title"
						type="text"
						value={isMultiple(entry.title) ? "" : entry.title}
						onChange={(e) => changeEntry({ title: e.target.value })}
						placeholder={
							isMultiple(entry.title) ? MULTIPLE_STR : BLANK_STR
						}
						readOnly={readOnly}
						isInvalid={!entry.title}
					/>
					<Form.Control.Feedback type="invalid">
						Enter meeting title
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-timezone">
						Time zone:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<TimeZoneSelector
						id="meeting-timezone"
						style={{ width: 250 }}
						value={
							isMultiple(entry.timezone) || !entry.timezone
								? ""
								: entry.timezone
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
						Enter time zone
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="meeting-date" className="mb-3">
				<Col>
					<Form.Label>Date:</Form.Label>
				</Col>
				<Col xs="auto">
					<Form.Control
						type="date"
						value={isMultiple(entry.date) ? "" : entry.date}
						onChange={(e) => changeEntry({ date: e.target.value })}
						placeholder={
							isMultiple(entry.date) ? MULTIPLE_STR : undefined
						}
						disabled={readOnly}
						isInvalid={!entry.date}
					/>
					<Form.Control.Feedback type="invalid">
						Enter date.
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-time">Start time:</Form.Label>
				</Col>
				<Col xs="auto">
					<InputTime
						id="meeting-time"
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
						Enter start time
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="meeting-duration">
						Duration:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<InputTimeRangeAsDuration
						id="meeting-duration"
						entry={
							isMultiple(entry.startTime) ||
							isMultiple(entry.endTime)
								? { startTime: "", endTime: "" }
								: entry
						}
						changeEntry={changeEntry}
						disabled={readOnly}
						placeholder={
							isMultiple(entry.startTime) ||
							isMultiple(entry.endTime)
								? MULTIPLE_STR
								: undefined
						}
						isInvalid={!entry.endTime}
					/>
					<Form.Control.Feedback type="invalid">
						Enter duration
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
		</>
	);
}

function WebexMeetingAudioOptionsEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: Multiple<WebexAudioConnectionOptions>;
	changeEntry: (changes: Partial<WebexAudioConnectionOptions>) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="allow-unmute-self">
						Allow unmute self:
					</Form.Label>
				</Col>
				<Col xs="auto" className="me-4">
					<Form.Check
						id="allow-unmute-self"
						checked={
							isMultiple(entry.allowAttendeeToUnmuteSelf)
								? false
								: entry.allowAttendeeToUnmuteSelf
						}
						ref={(ref) => {
							if (ref)
								ref.indeterminate = isMultiple(
									entry.allowAttendeeToUnmuteSelf
								);
						}}
						onChange={(e) =>
							changeEntry({
								allowAttendeeToUnmuteSelf: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="mute-attendee-on-entry">
						Mute attendee on entry:
					</Form.Label>
				</Col>
				<Col xs="auto" className="me-4">
					<Form.Check
						id="mute-attendee-on-entry"
						checked={
							isMultiple(entry.muteAttendeeUponEntry)
								? false
								: entry.muteAttendeeUponEntry
						}
						ref={(ref) => {
							if (ref)
								ref.indeterminate = isMultiple(
									entry.muteAttendeeUponEntry
								);
						}}
						onChange={(e) =>
							changeEntry({
								muteAttendeeUponEntry: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label htmlFor="entry-and-exit-tone">
						Entry and exit tone:
					</Form.Label>
				</Col>
				<Col xs="auto">
					<SelectEntryAndExitTone
						id="entry-and-exit-tone"
						value={
							isMultiple(entry.entryAndExitTone)
								? null
								: entry.entryAndExitTone
						}
						onChange={(entryAndExitTone) =>
							changeEntry({ entryAndExitTone })
						}
						placeholder={
							isMultiple(entry.entryAndExitTone)
								? MULTIPLE_STR
								: undefined
						}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}

function WebexMeetingOptionsEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: Multiple<WebexMeetingOptions>;
	changeEntry: (changes: Partial<WebexMeetingOptions>) => void;
	readOnly?: boolean;
}) {
	return (
		<Row className="mb-3">
			<Col xs="auto">
				<Form.Check
					id="meeting-options-chat"
					checked={
						isMultiple(entry.enabledChat)
							? false
							: entry.enabledChat
					}
					ref={(ref) => {
						if (ref)
							ref.indeterminate = isMultiple(entry.enabledChat);
					}}
					onChange={(e) =>
						changeEntry({ enabledChat: e.target.checked })
					}
					disabled={readOnly}
					label="Chat:"
					reverse
				/>
			</Col>
			<Col xs="auto">
				<Form.Check
					id="meeting-options-video"
					checked={
						isMultiple(entry.enabledVideo)
							? false
							: entry.enabledVideo
					}
					ref={(ref) => {
						if (ref)
							ref.indeterminate = isMultiple(entry.enabledVideo);
					}}
					onChange={(e) =>
						changeEntry({ enabledVideo: e.target.checked })
					}
					disabled={readOnly}
					label="Video:"
					reverse
				/>
			</Col>
			<Col xs="auto">
				<Form.Check
					id="meeting-options-notes"
					label="Notes:"
					reverse
					checked={
						isMultiple(entry.enabledNote)
							? false
							: entry.enabledNote
					}
					ref={(ref) => {
						if (ref)
							ref.indeterminate = isMultiple(entry.enabledNote);
					}}
					onChange={(e) =>
						changeEntry({ enabledNote: e.target.checked })
					}
					disabled={readOnly}
				/>
			</Col>
			<Col xs="auto">
				<Form.Check
					id="meeting-options-cc"
					label="Closed captions:"
					reverse
					checked={
						isMultiple(entry.enabledClosedCaptions)
							? false
							: entry.enabledClosedCaptions
					}
					ref={(ref) => {
						if (ref)
							ref.indeterminate = isMultiple(
								entry.enabledClosedCaptions
							);
					}}
					onChange={(e) =>
						changeEntry({ enabledClosedCaptions: e.target.checked })
					}
					disabled={readOnly}
				/>
			</Col>
			<Col xs="auto">
				<Form.Check
					id="meeting-options-file-transfer"
					label="File transfer:"
					reverse
					checked={
						isMultiple(entry.enabledFileTransfer)
							? false
							: entry.enabledFileTransfer
					}
					ref={(ref) => {
						if (ref)
							ref.indeterminate = isMultiple(
								entry.enabledFileTransfer
							);
					}}
					onChange={(e) =>
						changeEntry({ enabledFileTransfer: e.target.checked })
					}
					disabled={readOnly}
				/>
			</Col>
		</Row>
	);
}

export function WebexMeetingParamsEdit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: WebexMeetingEntryCreate | WebexMeetingEntryMultiple;
	changeEntry: (changes: WebexMeetingEntryPartial) => void;
	readOnly?: boolean;
}) {
	function handleChange(changes: WebexMeetingEntryPartial) {
		if (changes.enabledJoinBeforeHost === false) {
			changes.joinBeforeHostMinutes = 0;
			changes.enableConnectAudioBeforeHost = false;
		}
		changeEntry(changes);
	}

	return (
		<>
			<Form.Group as={Row} controlId="meeting-password" className="mb-3">
				<Form.Label column>Password:</Form.Label>
				<Col xs="auto">
					<Form.Control
						type="search"
						value={
							isMultiple(entry.password)
								? MULTIPLE_STR
								: entry.password
						}
						onChange={(e) =>
							handleChange({ password: e.target.value })
						}
						placeholder={
							isMultiple(entry.password)
								? MULTIPLE_STR
								: BLANK_STR
						}
						disabled={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Col>
					<Form.Label as="span" htmlFor="join-before-host-enabled">
						Join before host (minutes):
					</Form.Label>
				</Col>
				<Col xs="auto" className="d-flex align-items-center">
					<Form.Check
						id="join-before-host-enabled"
						className="me-4"
						checked={
							isMultiple(entry.enabledJoinBeforeHost)
								? false
								: entry.enabledJoinBeforeHost
						}
						ref={(ref) => {
							if (ref)
								ref.indeterminate = isMultiple(
									entry.enabledJoinBeforeHost
								);
						}}
						onChange={(e) =>
							handleChange({
								enabledJoinBeforeHost: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
					<SelectJoinBeforeHostMinutes
						id="join-before-host-minutes"
						value={
							isMultiple(entry.joinBeforeHostMinutes)
								? null
								: entry.joinBeforeHostMinutes
						}
						onChange={(joinBeforeHostMinutes) =>
							handleChange({ joinBeforeHostMinutes })
						}
						placeholder={
							isMultiple(entry.joinBeforeHostMinutes)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly || !entry.enabledJoinBeforeHost}
					/>
				</Col>
			</Form.Group>
			<Row className="mb-3">
				<Col>
					<Form.Label htmlFor="audio-before-host">
						Connect audio before host:
					</Form.Label>
				</Col>
				<Col xs="auto" className="me-4">
					<Form.Check
						id="audio-before-host"
						checked={
							isMultiple(entry.enableConnectAudioBeforeHost)
								? false
								: entry.enableConnectAudioBeforeHost
						}
						ref={(ref) => {
							if (ref)
								ref.indeterminate = isMultiple(
									entry.enableConnectAudioBeforeHost
								);
						}}
						onChange={(e) =>
							handleChange({
								enableConnectAudioBeforeHost: e.target.checked,
							})
						}
						disabled={readOnly || !entry.enabledJoinBeforeHost}
					/>
				</Col>
			</Row>
			<WebexMeetingAudioOptionsEdit
				entry={entry.audioConnectionOptions}
				changeEntry={(audioConnectionOptions) =>
					changeEntry({ audioConnectionOptions })
				}
				readOnly={readOnly}
			/>
			<WebexMeetingOptionsEdit
				entry={entry.meetingOptions}
				changeEntry={(meetingOptions) =>
					changeEntry({ meetingOptions })
				}
				readOnly={readOnly}
			/>
		</>
	);
}

function AssociatedMeetingSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number | null) => void;
} & Omit<
	React.ComponentProps<typeof MeetingSelector>,
	"value" | "onChange" | "fromDate" | "toDate"
>) {
	const session = useAppSelector(selectCurrentSession);
	let fromDate, toDate;
	if (session) {
		fromDate = session.startDate;
		toDate = session.endDate;
	}

	function handleChange(v: number | null) {
		if (v !== value) onChange(v);
	}

	return (
		<MeetingSelector
			value={value}
			onChange={handleChange}
			fromDate={fromDate}
			toDate={toDate}
			{...otherProps}
		/>
	);
}

export function WebexMeetingEditForm({
	action,
	entry,
	onChange,
	submit,
	cancel,
	hasChanges,
	readOnly,
}: {
	action: "add" | "update";
	entry: WebexMeetingEntryCreate | WebexMeetingEntryMultiple;
	onChange: (changes: WebexMeetingEntryPartial) => void;
	submit: () => Promise<void>;
	cancel: () => void;
	hasChanges: () => boolean;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);
	const [formInvalid, setFormInvalid] = React.useState(false);

	React.useLayoutEffect(() => {
		setFormInvalid(
			!entry.date ||
				!entry.startTime ||
				!entry.endTime ||
				!entry.timezone ||
				!entry.accountId
		);
	}, [entry]);

	async function onSubmit(e: React.ChangeEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await submit();
		setBusy(false);
	}

	return (
		<Form noValidate onSubmit={onSubmit} className="p-3">
			<WebexMeetingAccount
				entry={entry}
				changeEntry={onChange}
				readOnly={readOnly}
			/>
			<WebexMeetingTitleDateTimeEdit
				entry={entry}
				changeEntry={onChange}
				readOnly={readOnly}
			/>
			<WebexMeetingParamsEdit
				entry={entry}
				changeEntry={onChange}
				readOnly={readOnly}
			/>
			<Row>
				<Form.Label column htmlFor="associate-with-meeting">
					Associate with meeting:
				</Form.Label>
				<Col>
					<AssociatedMeetingSelector
						id="associate-with-meeting"
						value={
							isMultiple(entry.meetingId)
								? null
								: entry.meetingId || null
						}
						onChange={(meetingId) =>
							onChange({ meetingId: meetingId || undefined })
						}
						placeholder={
							isMultiple(entry.meetingId)
								? MULTIPLE_STR
								: BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Col>
			</Row>
			{hasChanges() && (
				<SubmitCancelRow
					submitLabel={action === "add" ? "Add" : "Update"}
					cancel={cancel}
					disabled={formInvalid}
					busy={busy}
				/>
			)}
		</Form>
	);
}
