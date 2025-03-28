import * as React from "react";
import { connect, ConnectedProps } from "react-redux";
import { DateTime } from "luxon";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
	ActionButton,
	Form,
	Row,
	Field,
	FieldLeft,
	Input,
	InputTime,
	Checkbox,
	Select,
	ConfirmModal,
	deepDiff,
	deepMerge,
	deepMergeTagMultiple,
	isMultiple,
	MULTIPLE,
	Multiple,
	setError,
} from "dot11-components";

import { RootState } from "@/store";
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
import { AccessLevel } from "@/store/user";

import WebexAccountSelector from "@/components/WebexAccountSelector";
import TimeZoneSelector from "@/components/TimeZoneSelector";
import InputTimeRangeAsDuration from "@/components/InputTimeRangeAsDuration";
import MeetingSelector from "@/components/MeetingSelector";

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
		<Row>
			<Field label="Webex account">
				<WebexAccountSelector
					value={isMultiple(entry.accountId) ? null : entry.accountId}
					onChange={onChange}
					placeholder={
						isMultiple(entry.accountId) ? MULTIPLE_STR : undefined
					}
					readOnly={readOnly}
					portal={document.querySelector("#root")}
				/>
			</Field>
		</Row>
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
	...otherProps
}: {
	value: WebexEntryExitTone | null;
	onChange: (value: WebexEntryExitTone) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
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
			{...otherProps}
		/>
	);
}

const joinMinutes = [0, 5, 10, 15];

function SelectJoinBeforeHostMinutes({
	value,
	onChange,
	...otherProps
}: {
	value: number | null | undefined;
	onChange: (value: number) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
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
			{...otherProps}
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
			<Row>
				<Field label="Title:">
					<Input
						type="text"
						value={isMultiple(entry.title) ? "" : entry.title}
						onChange={(e) => changeEntry({ title: e.target.value })}
						placeholder={
							isMultiple(entry.title) ? MULTIPLE_STR : BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Time zone:">
					<TimeZoneSelector
						style={{ width: 200 }}
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
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Date:">
					<Input
						type="date"
						//disablePast
						value={isMultiple(entry.date) ? "" : entry.date}
						onChange={(e) => changeEntry({ date: e.target.value })}
						placeholder={
							isMultiple(entry.date) ? MULTIPLE_STR : undefined
						}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Start time:">
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
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Duration:">
					<InputTimeRangeAsDuration
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
					/>
				</Field>
			</Row>
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
			<Row>
				<Field label="Allow unmute self:">
					<Checkbox
						checked={
							isMultiple(entry.allowAttendeeToUnmuteSelf)
								? false
								: entry.allowAttendeeToUnmuteSelf
						}
						indeterminate={isMultiple(
							entry.allowAttendeeToUnmuteSelf
						)}
						onChange={(e) =>
							changeEntry({
								allowAttendeeToUnmuteSelf: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Mute attendee on entry:">
					<Checkbox
						checked={
							isMultiple(entry.muteAttendeeUponEntry)
								? false
								: entry.muteAttendeeUponEntry
						}
						indeterminate={isMultiple(entry.muteAttendeeUponEntry)}
						onChange={(e) =>
							changeEntry({
								muteAttendeeUponEntry: e.target.checked,
							})
						}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Entry and exit tone:">
					<SelectEntryAndExitTone
						value={
							isMultiple(entry.entryAndExitTone)
								? null
								: entry.entryAndExitTone
						}
						onChange={(entryAndExitTone) =>
							changeEntry({ entryAndExitTone })
						}
						portal={document.querySelector("#root")}
						placeholder={
							isMultiple(entry.entryAndExitTone)
								? MULTIPLE_STR
								: undefined
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
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
		<Row style={{ flexWrap: "wrap" }}>
			<FieldLeft id="meeting-options-chat" label="Chat:">
				<Checkbox
					checked={
						isMultiple(entry.enabledChat)
							? false
							: entry.enabledChat
					}
					indeterminate={isMultiple(entry.enabledChat)}
					onChange={(e) =>
						changeEntry({ enabledChat: e.target.checked })
					}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft id="meeting-options-video" label="Video:">
				<Checkbox
					checked={
						isMultiple(entry.enabledVideo)
							? false
							: entry.enabledVideo
					}
					indeterminate={isMultiple(entry.enabledVideo)}
					onChange={(e) =>
						changeEntry({ enabledVideo: e.target.checked })
					}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft id="meeting-options-notes" label="Notes:">
				<Checkbox
					checked={
						isMultiple(entry.enabledNote)
							? false
							: entry.enabledNote
					}
					indeterminate={isMultiple(entry.enabledNote)}
					onChange={(e) =>
						changeEntry({ enabledNote: e.target.checked })
					}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft id="meeting-options-cc" label="Closed captions:">
				<Checkbox
					checked={
						isMultiple(entry.enabledClosedCaptions)
							? false
							: entry.enabledClosedCaptions
					}
					indeterminate={isMultiple(entry.enabledClosedCaptions)}
					onChange={(e) =>
						changeEntry({ enabledClosedCaptions: e.target.checked })
					}
					disabled={readOnly}
				/>
			</FieldLeft>
			<FieldLeft
				id="meeting-options-file-transfer"
				label="File transfer:"
			>
				<Checkbox
					checked={
						isMultiple(entry.enabledFileTransfer)
							? false
							: entry.enabledFileTransfer
					}
					indeterminate={isMultiple(entry.enabledFileTransfer)}
					onChange={(e) =>
						changeEntry({ enabledFileTransfer: e.target.checked })
					}
					disabled={readOnly}
				/>
			</FieldLeft>
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
			<Row>
				<Field id="meeting-password" label="Password:">
					<Input
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
				</Field>
			</Row>
			<Row>
				<Field label="Join before host (minutes):">
					<div style={{ display: "flex", alignItems: "center" }}>
						<Checkbox
							checked={
								isMultiple(entry.enabledJoinBeforeHost)
									? false
									: entry.enabledJoinBeforeHost
							}
							indeterminate={isMultiple(
								entry.enabledJoinBeforeHost
							)}
							onChange={(e) =>
								handleChange({
									enabledJoinBeforeHost: e.target.checked,
								})
							}
							disabled={readOnly}
						/>
						<SelectJoinBeforeHostMinutes
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
					</div>
				</Field>
			</Row>
			<Row>
				<Field
					id="audio-before-host"
					label="Connect audio before host:"
				>
					<Checkbox
						checked={
							isMultiple(entry.enableConnectAudioBeforeHost)
								? false
								: entry.enableConnectAudioBeforeHost
						}
						indeterminate={isMultiple(
							entry.enableConnectAudioBeforeHost
						)}
						onChange={(e) =>
							handleChange({
								enableConnectAudioBeforeHost: e.target.checked,
							})
						}
						disabled={readOnly || !entry.enabledJoinBeforeHost}
					/>
				</Field>
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
	busy,
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
	const dispatch = useAppDispatch();

	let submitForm,
		cancelForm,
		submitLabel,
		errMsg = "";
	if (submit) {
		if (!entry.date) errMsg = "Date not set";
		else if (!entry.startTime) errMsg = "Start time not set";
		else if (!entry.endTime) errMsg = "Duration not set";
		else if (!entry.timezone) errMsg = "Time zone not set";
		else if (!entry.accountId)
			errMsg = "Must select Webex account to schedule webex meeting";

		if (action === "add") {
			submitLabel = "Add";
		} else {
			submitLabel = "Update";
		}

		submitForm = () => {
			if (errMsg) {
				dispatch(setError("Fix error", errMsg));
				return;
			}
			submit();
		};

		cancelForm = cancel;
	}

	return (
		<Form
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
			busy={busy}
		>
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
				<Field label="Associate with meeting:">
					<AssociatedMeetingSelector
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
				</Field>
			</Row>
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
			<div>
				<ActionButton
					name="add"
					title="Add Webex meeting"
					disabled={loading || readOnly}
					onClick={this.clickAdd}
				/>
				<ActionButton
					name="delete"
					title="Delete webex meeting"
					disabled={loading || webexMeetings.length === 0 || readOnly}
					onClick={this.clickDelete}
				/>
			</div>
		);

		return (
			<>
				<div className="header">
					<h3 className="title">{title}</h3>
					{actionButtons}
				</div>
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
			</>
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
