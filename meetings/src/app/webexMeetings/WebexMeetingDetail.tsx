import * as React from "react";
import { Container, Row, Col, Form, Button, Spinner } from "react-bootstrap";
import { connect, ConnectedProps } from "react-redux";
import { DateTime } from "luxon";

import { useAppSelector } from "@/store/hooks";
import {
	Select,
	ConfirmModal,
	deepDiff,
	deepMerge,
	deepMergeTagMultiple,
	isMultiple,
	MULTIPLE,
	Multiple,
	InputTime,
	AccessLevel,
} from "@common";

import { type RootState } from "@/store";
import {
	selectWebexMeetingsState,
	selectSyncedWebexMeetingEntities,
	selectUserWebexMeetingsAccess,
	addWebexMeeting,
	updateWebexMeetings,
	deleteWebexMeetings,
	setSelected,
	WebexMeeting,
	WebexMeetingOptions,
	WebexAudioConnectionOptions,
	WebexMeetingUpdate,
	WebexEntryExitTone,
	SyncedWebexMeeting,
} from "@/store/webexMeetings";
import { updateMeetings, Meeting } from "@/store/meetings";
import { selectWebexAccountDefaultId } from "@/store/webexAccounts";
import { selectCurrentSession } from "@/store/sessions";

import WebexAccountSelector from "@/components/WebexAccountSelector";
import TimeZoneSelector from "@/components/TimeZoneSelector";
import InputTimeRangeAsDuration from "@/components/InputTimeRangeAsDuration";
import MeetingSelector from "@/components/MeetingSelector";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

import {
	defaultWebexMeeting,
	convertEntryToWebexMeeting,
	convertWebexMeetingToEntry,
	WebexMeetingEntry,
	PartialWebexMeetingEntry,
	MultipleWebexMeetingEntry,
} from "./convertWebexMeetingEntry";

const MULTIPLE_STR = "(Multiple)";
const BLANK_STR = "(Blank)";

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
	entry: MultipleWebexMeetingEntry;
	changeEntry: (changes: PartialWebexMeetingEntry) => void;
	readOnly?: boolean;
}) {
	function handleChange(changes: PartialWebexMeetingEntry) {
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
				entry={entry.meetingOptions || {}}
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

function WebexMeetingEntryForm({
	action,
	entry,
	changeEntry,
	submit,
	cancel,
	readOnly,
}: {
	action: "add" | "update";
	busy: boolean;
	entry: MultipleWebexMeetingEntry;
	changeEntry: (changes: PartialWebexMeetingEntry) => void;
	submit?: () => void;
	cancel?: () => void;
	readOnly?: boolean;
}) {
	const [formValid, setFormValid] = React.useState(false);

	React.useLayoutEffect(() => {
		let valid = true;
		if (
			!entry.date ||
			!entry.startTime ||
			!entry.endTime ||
			!entry.timezone ||
			!entry.accountId
		)
			valid = false;
		if (formValid !== valid) setFormValid(valid);
	}, [entry]);

	function submitForm(e: React.ChangeEvent<HTMLFormElement>) {
		e.preventDefault();
		submit?.();
	}

	return (
		<Form noValidate onSubmit={submitForm} className="p-3">
			<WebexMeetingAccount
				entry={entry}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
			<WebexMeetingTitleDateTimeEdit
				entry={entry}
				changeEntry={changeEntry}
				readOnly={readOnly}
			/>
			<WebexMeetingParamsEdit
				entry={entry}
				changeEntry={changeEntry}
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
							changeEntry({ meetingId: meetingId || undefined })
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
			{submit && (
				<SubmitCancelRow
					submitLabel={action === "add" ? "Add" : "Update"}
					cancel={cancel}
					disabled={!formValid}
				/>
			)}
		</Form>
	);
}

type Actions = "add" | "update";

type WebexMeetingDetailState = {
	action: Actions;
	entry: MultipleWebexMeetingEntry;
	saved: MultipleWebexMeetingEntry;
	webexMeetings: WebexMeeting[];
	busy: boolean;
};

class WebexMeetingDetail extends React.Component<
	WebexMeetingDetailConnectedProps,
	WebexMeetingDetailState
> {
	constructor(props: WebexMeetingDetailConnectedProps) {
		super(props);
		this.state = this.initState("update");
	}

	componentDidUpdate() {
		const { selected, setSelected } = this.props;
		const { action, webexMeetings } = this.state;
		const ids = webexMeetings.map((b) => b.id);

		const changeWithConfirmation = async () => {
			if (action === "update" && this.hasUpdates()) {
				const ok = await ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				);
				if (!ok) {
					setSelected(ids);
					return;
				}
			}
			this.reinitState("update");
		};

		if (selected.join() !== ids.join()) changeWithConfirmation();
	}

	initState = (action: Actions): WebexMeetingDetailState => {
		const { entities, selected, defaultWebexAccountId } = this.props;

		const webexMeetings: SyncedWebexMeeting[] = selected
			.filter((id) => entities[id])
			.map((id) => {
				// Redo 'start' and 'end' - there is an extra zero on the milliseconds
				let webexMeeting = entities[id]!;
				webexMeeting = {
					...webexMeeting,
					start: DateTime.fromISO(webexMeeting.start, {
						zone: webexMeeting.timezone,
					}).toISO()!,
					end: DateTime.fromISO(webexMeeting.end, {
						zone: webexMeeting.timezone,
					}).toISO()!,
				};
				//return webexMeetingToWebexMeetingParams(webexMeeting);
				return webexMeeting;
			});
		let entry: MultipleWebexMeetingEntry;
		if (action === "update") {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const entryMerge: any = webexMeetings.reduce(
				(entry, webexMeeting) =>
					deepMergeTagMultiple(
						entry,
						convertWebexMeetingToEntry(webexMeeting)
					),
				{}
			);
			const meetingOptions: WebexMeetingOptions =
				!entryMerge.meetingOptions ||
				Object.values(entryMerge.meetingOptions).includes(MULTIPLE)
					? defaultWebexMeeting.meetingOptions
					: entryMerge.meetingOptions;
			const audioConnectionOptions: WebexAudioConnectionOptions =
				!entryMerge.audioConnectionOptions ||
				Object.values(entryMerge.audioConnectionOptions).includes(
					MULTIPLE
				)
					? defaultWebexMeeting.audioConnectionOptions
					: entryMerge.audioConnectionOptions;
			entry = { ...entryMerge, meetingOptions, audioConnectionOptions };
		} else {
			entry = {
				...defaultWebexMeeting,
				meetingOptions: defaultWebexMeeting.meetingOptions!,
				audioConnectionOptions:
					defaultWebexMeeting.audioConnectionOptions!,
				accountId: defaultWebexAccountId,
			};
		}
		//console.log(action, entry)
		return {
			action,
			entry,
			saved: entry,
			webexMeetings,
			busy: false,
		};
	};

	reinitState = (action: Actions) => {
		this.setState(this.initState(action));
	};

	getUpdates = () => {
		const { entry, saved, webexMeetings } = this.state;

		// Find differences
		const diff: PartialWebexMeetingEntry = deepDiff(saved, entry) || {};
		const webexMeetingUpdates: WebexMeetingUpdate[] = [];
		const meetingUpdates: { id: number; changes: Partial<Meeting> }[] = [];
		console.log(diff);
		for (const webexMeeting of webexMeetings) {
			const local: WebexMeetingEntry = deepMerge(
				convertWebexMeetingToEntry(webexMeeting),
				diff
			);
			const updated = convertEntryToWebexMeeting(local);
			const changes: Partial<SyncedWebexMeeting> =
				deepDiff(webexMeeting, updated) || {};
			console.log(local, updated, changes);
			if (changes.meetingId) {
				// Associating with a meeting
				meetingUpdates.push({
					id: changes.meetingId,
					changes: {
						webexAccountId: updated.accountId,
						webexMeetingId: webexMeeting.id,
					},
				});
				delete changes.meetingId;
			}
			if (Object.keys(changes).length > 0) {
				webexMeetingUpdates.push({ ...updated, id: webexMeeting.id });
			}
		}
		return { webexMeetingUpdates, meetingUpdates };
	};

	hasUpdates = () => this.state.saved !== this.state.entry;

	changeEntry = (changes: PartialWebexMeetingEntry) => {
		//console.log('change', changes)
		this.setState((state) => {
			let entry: MultipleWebexMeetingEntry = deepMerge(
				state.entry,
				changes
			);
			// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
			changes = deepDiff(state.saved, entry) || {};
			if (Object.keys(changes).length === 0) entry = state.saved;
			return { ...state, entry };
		});
	};

	clickAdd = async () => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for clickAdd()");
			return;
		}

		const { setSelected } = this.props;
		const { action } = this.state;

		if (action === "update" && this.hasUpdates()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}

		this.reinitState("add");
		setSelected([]);
	};

	clickDelete = async () => {
		if (this.props.access <= AccessLevel.ro) {
			console.warn("Insufficient access for clickDelete()");
			return;
		}

		const { deleteWebexMeetings } = this.props;
		const { webexMeetings } = this.state;
		const ids = webexMeetings.map((m) => m.id);
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the " +
				(ids.length > 1
					? ids.length + " selected entries?"
					: "selected entry?")
		);
		if (!ok) return;
		await deleteWebexMeetings(webexMeetings);
		this.reinitState("update");
	};

	add = async () => {
		const { setSelected, addWebexMeeting, updateMeetings } = this.props;
		const entry = this.state.entry as WebexMeetingEntry;
		this.setState({ busy: true });

		const webexMeeting = convertEntryToWebexMeeting(entry);
		const id = await addWebexMeeting(entry.accountId!, webexMeeting);
		if (entry.meetingId)
			await updateMeetings([
				{
					id: entry.meetingId,
					changes: {
						webexAccountId: entry.accountId,
						webexMeetingId: id,
					},
				},
			]);
		setSelected(id ? [id] : []);
		this.reinitState("update");
	};

	update = async () => {
		const { updateWebexMeetings, updateMeetings } = this.props;
		this.setState({ busy: true });

		const { webexMeetingUpdates, meetingUpdates } = this.getUpdates();
		console.log(webexMeetingUpdates, meetingUpdates);
		if (webexMeetingUpdates.length > 0)
			await updateWebexMeetings(webexMeetingUpdates);
		if (meetingUpdates.length > 0) await updateMeetings(meetingUpdates);
		this.reinitState("update");
	};

	cancel = () => {
		this.reinitState("update");
	};

	render() {
		const { loading, access } = this.props;
		const { action, busy, entry, webexMeetings } = this.state;

		let notAvailableStr = "";
		if (loading) notAvailableStr = "Loading...";
		else if (action === "update" && webexMeetings.length === 0)
			notAvailableStr = "Nothing selected";

		let submit, cancel;
		let title = "";
		if (!notAvailableStr) title = "Webex meeting";
		if (action === "add") {
			submit = this.add;
			cancel = this.cancel;
			title = "Add Webex meeting";
		} else if (this.hasUpdates()) {
			submit = this.update;
			cancel = this.cancel;
			title = "Update Webex meeting";
		}

		const readOnly = access <= AccessLevel.ro;

		const actionButtons = (
			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				<Spinner
					animation="border"
					role="status"
					size="sm"
					hidden={!busy && !loading}
				/>
				<Button
					variant="outline-primary"
					className="bi-plus-lg"
					title="Add Webex meeting"
					disabled={loading || readOnly}
					onClick={this.clickAdd}
				>
					{" Add"}
				</Button>
				<Button
					variant="outline-primary"
					className="bi-trash"
					title="Delete webex meeting"
					disabled={loading || webexMeetings.length === 0 || readOnly}
					onClick={this.clickDelete}
				>
					{" Delete"}
				</Button>
			</Col>
		);

		return (
			<Container fluid>
				<Row className="ps-3 pe-3">
					<Col>
						<h3 className="title">{title}</h3>
					</Col>
					{actionButtons}
				</Row>
				{notAvailableStr ? (
					<div className="placeholder">{notAvailableStr}</div>
				) : (
					<WebexMeetingEntryForm
						action={action}
						busy={busy}
						entry={entry}
						changeEntry={this.changeEntry}
						submit={submit}
						cancel={cancel}
						readOnly={readOnly}
					/>
				)}
			</Container>
		);
	}
}

const connector = connect(
	(state: RootState) => ({
		loading: selectWebexMeetingsState(state).loading,
		selected: selectWebexMeetingsState(state).selected,
		entities: selectSyncedWebexMeetingEntities(state),
		defaultWebexAccountId: selectWebexAccountDefaultId(state),
		access: selectUserWebexMeetingsAccess(state),
	}),
	{
		setSelected,
		addWebexMeeting,
		updateWebexMeetings,
		deleteWebexMeetings,
		updateMeetings,
	}
);

type WebexMeetingDetailConnectedProps = ConnectedProps<typeof connector>;

const ConnectedWebexMeetingDetail = connector(WebexMeetingDetail);

export default ConnectedWebexMeetingDetail;
