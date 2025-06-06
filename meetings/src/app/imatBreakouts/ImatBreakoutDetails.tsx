import * as React from "react";
import { connect, ConnectedProps } from "react-redux";
import { DateTime } from "luxon";
import type { Dictionary } from "@reduxjs/toolkit";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUserMeetingsAccess } from "@/store/meetings";

import {
	ConfirmModal,
	deepDiff,
	deepMerge,
	deepMergeTagMultiple,
	isMultiple,
	ActionButton,
	Form,
	Row,
	Field,
	Select,
	Input,
	InputTime,
	setError,
	Multiple,
} from "dot11-components";

import ImatCommitteeSelector from "@/components/ImatCommitteeSelector";
import MeetingSelector from "@/components/MeetingSelector";
import {
	convertEntryToMeeting,
	type MeetingEntry,
	type MultipleMeetingEntry,
	type PartialMeetingEntry,
} from "../meetings/convertMeetingEntry";
import MeetingEntryForm from "../meetings/MeetingEntry";

import { RootState } from "@/store";
import {
	addBreakouts,
	updateBreakouts,
	deleteBreakouts,
	setSelectedBreakouts,
	selectBreakoutMeetingId,
	selectBreakoutMeeting,
	selectBreakoutsState,
	selectSyncedBreakoutEntities,
	SyncedBreakout,
	Breakout,
} from "@/store/imatBreakouts";
import { ImatMeeting } from "@/store/imatMeetings";
import { selectCurrentSession, Session } from "@/store/sessions";
import { updateMeetings, addMeetings } from "@/store/meetings";
import {
	selectGroupEntities,
	Group,
	selectTopLevelGroupId,
} from "@/store/groups";
import { AccessLevel } from "@/store/user";

const MULTIPLE_STR = "(Multiple)";
const BLANK_STR = "(Blank)";

const fromTimeStr = (str: string) => {
	const m = str.match(/(\d+):(\d+)/);
	return m
		? { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) }
		: { hour: 0, minute: 0 };
};

function convertBreakoutToMeetingEntry(
	breakout: Breakout,
	imatMeeting: ImatMeeting,
	session: Session,
	groupId: string,
	groupEntities: Dictionary<Group>
) {
	const start = DateTime.fromFormat(
		`${imatMeeting.start} ${breakout.startTime}`,
		"yyyy-MM-dd HH:mm",
		{ zone: imatMeeting.timezone }
	).plus({ days: breakout.day });
	//const end = DateTime.fromFormat(`${imatMeeting.start} ${breakout.endTime}`, 'yyyy-MM-dd HH:mm', {zone: imatMeeting.timezone}).plus({days: breakout.day});

	const groups = Object.values(groupEntities) as Group[];
	const bNameRe = new RegExp(breakout.name, "i");
	const group =
		groups.find(
			(g) => g.name.toLowerCase() === breakout.name.toLowerCase()
		) || // near exact match
		groups.find((g) => breakout.name.match(new RegExp(g.name, "i"))) || // case invariant substring match
		groups.find((g) => g.name.match(bNameRe)); // both ways

	const organizationId = group?.id || groupId;

	const entry: MultipleMeetingEntry = {
		summary: breakout.name,
		//start: start.toISO(),
		//end: end.toISO(),
		date: start.toISODate()!,
		dates: [start.toISODate()!],
		slots: [],
		startTime: breakout.startTime,
		endTime: breakout.endTime,
		startSlotId: null,
		duration: "",
		location: breakout.location,
		organizationId,
		hasMotions: false,
		isCancelled: false,
		timezone: imatMeeting.timezone,
		calendarAccountId: null,
		calendarEventId: null,
		webexAccountId: null,
		webexMeetingId: null,
		//webexMeeting: {accountId: null},
		imatMeetingId: imatMeeting.id,
		imatBreakoutId: breakout.id,
		sessionId: session.id,
		roomId: 0,
	};

	const room = session.rooms.find((r) => r.name === breakout.location);
	if (room && room.id) entry.roomId = room.id;

	let startSlot = session.timeslots.find((s) => {
		const slotStart = start.set(fromTimeStr(s.startTime));
		const slotEnd = start.set(fromTimeStr(s.endTime));
		return start >= slotStart && start < slotEnd;
	});
	if (!startSlot) {
		// If we can't find a slot that includes the startTime then find best match
		startSlot = session.timeslots.find((s) => {
			const slotStart = start.set(fromTimeStr(s.startTime));
			return start >= slotStart;
		});
	}
	if (startSlot) entry.startSlotId = startSlot.id;

	//console.log(entry)
	return entry;
}

function SlotSelector({
	value,
	onChange,
	isStart,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number) => void;
	isStart?: boolean;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
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
			{...otherProps}
		/>
	);
}

const StartSlotSelector = (props: React.ComponentProps<typeof SlotSelector>) =>
	SlotSelector({ ...props, isStart: true });
const EndSlotSelector = SlotSelector;

function SessionDaySelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number) => void;
} & Omit<
	React.ComponentProps<typeof Select>,
	"values" | "onChange" | "options"
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
			{...otherProps}
		/>
	);
}

function GroupIdSelector({
	value,
	onChange,
	...otherProps
}: {
	value: number | null;
	onChange: (value: number) => void;
} & Omit<
	React.ComponentProps<typeof ImatCommitteeSelector>,
	"value" | "onChange"
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
			{...otherProps}
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

const getDefaultBreakout = (): Breakout => ({
	id: 0,
	name: "",
	day: 0,
	start: "",
	startTime: "",
	startSlotId: 0,
	end: "",
	endTime: "",
	endSlotId: 0,
	groupId: 0,
	symbol: "",
	location: "",
	credit: "Zero",
	creditOverrideDenominator: 0,
	creditOverrideNumerator: 0,
	facilitator: "", //window.user? window.user.Email: ''
});

export function BreakoutCredit({
	entry,
	changeEntry,
	readOnly,
}: {
	entry: MultipleBreakoutEntry;
	changeEntry: (changes: BreakoutEntryChanges) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Row>
				<Field label="Credit:">
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
						}}
					>
						<div style={{ margin: "0 5px" }}>
							<input
								type="radio"
								id="extra"
								value="Extra"
								checked={entry.credit === "Extra"}
								//indeterminate={isMultiple(entry.credit).toString()}
								onChange={(e) =>
									changeEntry({ credit: e.target.value })
								}
								disabled={readOnly}
							/>
							<label htmlFor="extra">Extra</label>
						</div>
						<div style={{ margin: "0 5px" }}>
							<input
								type="radio"
								id="normal"
								value="Normal"
								checked={entry.credit === "Normal"}
								//indeterminate={isMultiple(entry.credit).toString()}
								onChange={(e) =>
									changeEntry({ credit: e.target.value })
								}
								disabled={readOnly}
							/>
							<label htmlFor="normal">Normal</label>
						</div>
						<div style={{ margin: "0 5px" }}>
							<input
								type="radio"
								id="other"
								value="Other"
								checked={entry.credit === "Other"}
								//indeterminate={isMultiple(entry.credit).toString()}
								onChange={(e) =>
									changeEntry({ credit: e.target.value })
								}
								disabled={readOnly}
							/>
							<label htmlFor="other">Other</label>
						</div>
						<div style={{ margin: "0 5px" }}>
							<input
								type="radio"
								id="zero"
								value="Zero"
								checked={entry.credit === "Zero"}
								//indeterminate={isMultiple(entry.credit).toString()}
								onChange={(e) =>
									changeEntry({ credit: e.target.value })
								}
								disabled={readOnly}
							/>
							<label htmlFor="zero">Zero</label>
						</div>
					</div>
				</Field>
			</Row>
			<Row>
				<Field label="Other credit (numerator/denominator):">
					<div>
						<Input
							type="text"
							size={4}
							value={
								isMultiple(entry.creditOverrideNumerator)
									? ""
									: entry.creditOverrideNumerator || ""
							}
							onChange={(e) =>
								changeEntry({
									creditOverrideNumerator: Number(
										e.target.value
									),
								})
							}
							disabled={entry.credit !== "Other" || readOnly}
							placeholder={
								isMultiple(entry.creditOverrideNumerator)
									? MULTIPLE_STR
									: undefined
							}
						/>
						<label>/</label>
						<Input
							type="text"
							size={4}
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
					</div>
				</Field>
			</Row>
		</>
	);
}

function BreakoutEntryForm({
	entry,
	changeEntry,
	busy,
	submit,
	cancel,
	action,
	readOnly,
}: {
	entry: SyncedBreakout | MultipleBreakoutEntry;
	changeEntry: (changes: BreakoutEntryChanges) => void;
	action: "add" | "update";
	submit?: () => void;
	cancel?: () => void;
	busy?: boolean;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const { timeslots } = useAppSelector(selectBreakoutsState);

	let errMsg: string | undefined;
	if (!entry.name) errMsg = "Enter breakout name";
	else if (!entry.groupId) errMsg = "Select group";
	else if (!entry.startSlotId) errMsg = "Select start slot";

	let submitForm, cancelForm, submitLabel;
	if (submit) {
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

	function handleChange(changes: BreakoutEntryChanges) {
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
		<Form
			busy={busy}
			submitLabel={submitLabel}
			submit={submitForm}
			cancel={cancelForm}
			errorText={errMsg}
		>
			<Row>
				<Field label="Meeting name:">
					<Input
						type="text"
						value={isMultiple(entry.name) ? "" : entry.name}
						onChange={(e) => handleChange({ name: e.target.value })}
						placeholder={
							isMultiple(entry.name) ? MULTIPLE_STR : BLANK_STR
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Group:">
					<GroupIdSelector
						value={isMultiple(entry.groupId) ? null : entry.groupId}
						onChange={(groupId) => handleChange({ groupId })}
						placeholder={
							isMultiple(entry.groupId) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Session day:">
					<SessionDaySelector
						value={isMultiple(entry.day) ? null : entry.day}
						onChange={(day) => handleChange({ day })}
						placeholder={
							isMultiple(entry.day) ? MULTIPLE_STR : undefined
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Start slot:">
					<StartSlotSelector
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
				</Field>
			</Row>
			<Row>
				<Field label="Override start time:">
					<InputTime
						value={
							isMultiple(entry.startTime) ? "" : entry.startTime
						}
						onChange={(startTime) => handleChange({ startTime })}
						placeholder={
							isMultiple(entry.startTime)
								? MULTIPLE_STR
								: "No override"
						}
						readOnly={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="End slot:">
					<EndSlotSelector
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
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Override end time:">
					<InputTime
						value={isMultiple(entry.endTime) ? "" : entry.endTime}
						onChange={(endTime) => handleChange({ endTime })}
						placeholder={
							isMultiple(entry.endTime)
								? MULTIPLE_STR
								: "No override"
						}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Location/room:">
					<Input
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
				</Field>
			</Row>
			<BreakoutCredit
				entry={entry}
				changeEntry={handleChange}
				readOnly={readOnly}
			/>
			<Row>
				<Field label="Facilitator:">
					<Input
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
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label="Associate with meeting:">
					<AssociatedMeetingSelector
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
				</Field>
			</Row>
		</Form>
	);
}

type Action = "add" | "update" | "import";

type MultipleBreakoutEntry = Multiple<SyncedBreakout>;

type BreakoutEntryChanges = Partial<SyncedBreakout>;

type BreakoutDetailsCommonState = {
	imatMeetingId: number | null;
	breakouts: SyncedBreakout[];
	busy: boolean;
};

/** action "add" => add a breakout */
type BreakoutDetailsAddState = {
	action: "add";
	entry: SyncedBreakout;
	saved: SyncedBreakout;
} & BreakoutDetailsCommonState;

/** action "import" => import breakout as a meeting */
type BreakoutDetailsImportState = {
	action: "import";
	entry: MultipleMeetingEntry;
	saved: MultipleMeetingEntry;
} & BreakoutDetailsCommonState;

/** action "update" => view or update one or more entries */
type BreakoutDetailsUpdateState = {
	action: "update";
	entry: MultipleBreakoutEntry;
	saved: MultipleBreakoutEntry;
} & BreakoutDetailsCommonState;

type BreakoutDetailsState =
	| BreakoutDetailsAddState
	| BreakoutDetailsImportState
	| BreakoutDetailsUpdateState;

class BreakoutDetails extends React.Component<
	BreakoutDetailsConnectedProps,
	BreakoutDetailsState
> {
	constructor(props: BreakoutDetailsConnectedProps) {
		super(props);
		this.state = this.initState("update");
	}

	componentDidUpdate() {
		const { selected, setSelected } = this.props;
		const { action, breakouts } = this.state;
		const ids = breakouts.map((b) => b.id);

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

	initState = (action: Action): BreakoutDetailsState => {
		const {
			entities,
			selected,
			imatMeetingId,
			imatMeeting,
			session,
			groupId,
			groupEntities,
		} = this.props;

		if (action === "add") {
			const entry: SyncedBreakout = {
				...getDefaultBreakout(),
				imatMeetingId,
				meetingId: null,
			};
			return {
				action,
				entry,
				saved: entry,
				imatMeetingId,
				breakouts: [],
				busy: false,
			};
		} else if (action === "import") {
			const id = selected[0];
			const breakout = entities[id]!;
			const entry = convertBreakoutToMeetingEntry(
				breakout,
				imatMeeting!,
				session!,
				groupId,
				groupEntities
			);
			return {
				action,
				entry,
				saved: entry,
				imatMeetingId,
				breakouts: [breakout],
				busy: false,
			};
		} else {
			const breakouts = selected.map((id) => entities[id]!);
			const entry = breakouts.reduce(
				(entry, breakout) => deepMergeTagMultiple(entry, breakout),
				{}
			) as MultipleBreakoutEntry;
			return {
				action,
				entry,
				saved: entry,
				imatMeetingId,
				breakouts,
				busy: false,
			};
		}
	};

	reinitState = (action: Action) => {
		this.setState(this.initState(action));
	};

	getUpdates = () => {
		/* Only called when action === "update" */
		const { entry, saved, imatMeetingId, breakouts } = this
			.state as BreakoutDetailsUpdateState;

		// Find differences
		const diff = deepDiff(saved, entry) || {};
		const breakoutUpdates: SyncedBreakout[] = [],
			meetingUpdates: {
				id: number;
				changes: {
					imatMeetingId: number | null;
					imatBreakoutId: number;
				};
			}[] = [];
		for (const breakout of breakouts) {
			const updated: SyncedBreakout = deepMerge(breakout, diff);
			const changes: Partial<SyncedBreakout> =
				deepDiff(breakout, updated) || {};
			if (changes.meetingId) {
				meetingUpdates.push({
					id: changes.meetingId,
					changes: { imatMeetingId, imatBreakoutId: breakout.id },
				});
				delete changes.meetingId;
			}
			if (Object.keys(changes).length > 0) {
				breakoutUpdates.push(updated);
			}
		}
		return { breakoutUpdates, meetingUpdates };
	};

	hasUpdates = () => this.state.saved !== this.state.entry;

	changeBreakoutEntry = (changes: BreakoutEntryChanges) => {
		this.setState((addUpdateState) => {
			const state = addUpdateState as
				| BreakoutDetailsAddState
				| BreakoutDetailsUpdateState;
			let entry = { ...state.entry, ...changes };
			const diff = deepDiff(state.saved, entry) || {};
			if (Object.keys(diff).length === 0) entry = state.saved;
			return { ...state, entry };
		});
	};

	changeMeetingEntry = (changes: PartialMeetingEntry) => {
		this.setState((importState) => {
			const state = importState as BreakoutDetailsImportState;
			let entry = deepMerge(state.entry, changes) as MultipleMeetingEntry;
			const diff = deepDiff(state.saved, entry) || {};
			if (Object.keys(diff).length === 0) entry = state.saved;
			return { ...state, entry };
		});
	};

	clickAdd = async () => {
		const { setSelected } = this.props;
		const { action } = this.state;

		if (action === "update" && this.hasUpdates()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}

		setSelected([]);
		this.reinitState("add");
	};

	clickDelete = async () => {
		const { deleteBreakouts } = this.props;
		const { imatMeetingId, breakouts } = this.state;

		const ids = breakouts.map((b) => b.id);
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the " +
				(ids.length > 1
					? ids.length + " selected entries?"
					: "selected entry?")
		);
		if (!ok) return;
		await deleteBreakouts(imatMeetingId!, ids);
		this.reinitState("update");
	};

	clickImport = () => {
		this.reinitState("import");
	};

	add = async () => {
		const { addBreakouts, updateMeetings, setSelected } = this.props;
		const { entry, imatMeetingId } = this.state as BreakoutDetailsAddState;

		this.setState({ busy: true });
		const [id] = await addBreakouts(imatMeetingId!, [entry]);
		if (entry.meetingId)
			await updateMeetings([
				{
					id: entry.meetingId,
					changes: { imatMeetingId, imatBreakoutId: id },
				},
			]);
		setSelected([id]);
		this.reinitState("update");
	};

	update = async () => {
		const { updateBreakouts, updateMeetings } = this.props;
		const { imatMeetingId } = this.state;

		const { breakoutUpdates, meetingUpdates } = this.getUpdates();
		//console.log(updates)

		this.setState({ busy: true });
		if (breakoutUpdates.length > 0)
			await updateBreakouts(imatMeetingId!, breakoutUpdates);
		if (meetingUpdates.length > 0) await updateMeetings(meetingUpdates);
		this.reinitState("update");
	};

	import = async () => {
		const { addMeetings, session } = this.props;
		let { entry } = this.state as BreakoutDetailsImportState;

		// If a webex account is given, then add a webex meeting
		if (entry.webexAccountId) {
			entry = { ...entry, webexMeetingId: "$add" };
			if (entry.webexMeeting) entry.webexMeeting.publicMeeting = false;
		}

		const { dates, ...rest } = entry;
		const meetings = dates.map((date) =>
			convertEntryToMeeting({ ...rest, date } as MeetingEntry, session)
		);
		//console.log(meetings);

		this.setState({ busy: true });
		await addMeetings(meetings);
		this.reinitState("update");
	};

	cancel = () => {
		this.reinitState("update");
	};

	render() {
		const { loading, access } = this.props;
		const { action, entry, breakouts, busy } = this.state;

		let notAvailableStr = "";
		if (loading) notAvailableStr = "Loading...";
		else if (action === "update" && breakouts.length === 0)
			notAvailableStr = "Nothing selected";

		let submit, cancel;
		let title = "";
		if (!notAvailableStr) title = "Breakout";
		if (action === "import") {
			submit = this.import;
			cancel = this.cancel;
			title = "Import as meeting";
		} else if (action === "add") {
			submit = this.add;
			cancel = this.cancel;
			title = "Add breakout";
		} else if (this.hasUpdates()) {
			submit = this.update;
			cancel = this.cancel;
			title = "Update breakout";
		}

		const readOnly = access <= AccessLevel.ro;

		const actionButtons = (
			<div>
				<ActionButton
					name="import"
					title="Import as meeting"
					disabled={loading || busy || readOnly}
					onClick={this.clickImport}
				/>
				<ActionButton
					name="add"
					title="Add breakout"
					disabled={loading || busy || readOnly}
					isActive={action === "add"}
					onClick={this.clickAdd}
				/>
				<ActionButton
					name="delete"
					title="Delete breakout"
					disabled={
						loading || breakouts.length === 0 || busy || readOnly
					}
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
				) : action === "import" ? (
					<MeetingEntryForm
						entry={entry}
						changeEntry={this.changeMeetingEntry}
						busy={busy}
						action="add-by-date"
						submit={submit}
						cancel={cancel}
					/>
				) : (
					<BreakoutEntryForm
						entry={entry}
						changeEntry={this.changeBreakoutEntry}
						busy={busy}
						action={action}
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
		imatMeetingId: selectBreakoutMeetingId(state),
		imatMeeting: selectBreakoutMeeting(state),
		timeslots: selectBreakoutsState(state).timeslots,
		loading: selectBreakoutsState(state).loading,
		selected: selectBreakoutsState(state).selected,
		entities: selectSyncedBreakoutEntities(state),
		session: selectCurrentSession(state),
		groupId: selectTopLevelGroupId(state)!,
		groupEntities: selectGroupEntities(state),
		access: selectUserMeetingsAccess(state),
	}),
	{
		setSelected: setSelectedBreakouts,
		updateBreakouts,
		addBreakouts,
		deleteBreakouts,
		updateMeetings,
		addMeetings,
	}
);

type BreakoutDetailsConnectedProps = ConnectedProps<typeof connector>;

const ConnectedBreakoutDetails = connector(BreakoutDetails);

export default ConnectedBreakoutDetails;
