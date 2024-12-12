import * as React from "react";
import { connect, ConnectedProps } from "react-redux";
import { DateTime, Duration } from "luxon";

import {
	ConfirmModal,
	deepDiff,
	deepMerge,
	deepMergeTagMultiple,
	isMultiple,
	MULTIPLE,
	Multiple,
	ActionButton,
	setError,
} from "dot11-components";

import type { RootState } from "../store";
import { selectCurrentGroupDefaults } from "../store/current";
import { selectGroupEntities, selectTopLevelGroupId } from "../store/groups";
import {
	selectUserMeetingsAccess,
	SyncedMeeting,
	MeetingUpdate,
} from "../store/meetings";
import { AccessLevel } from "../store/user";

import {
	selectCurrentSession,
	fromSlotId,
	Session,
	Timeslot,
	Room,
	toSlotId,
} from "../store/sessions";

import {
	addMeetings,
	updateMeetings,
	deleteMeetings,
	setSelectedMeetings,
	setSelectedSlots,
	selectMeetingsState,
	selectSyncedMeetingEntities,
	selectSelectedMeetings,
	selectSelectedSlots,
	Meeting,
	MeetingCreate,
} from "../store/meetings";

import {
	WebexMeetingChange,
	webexMeetingToWebexMeetingParams,
} from "../store/webexMeetings";

import {
	defaultWebexMeeting,
	MultipleWebexMeetingEntry,
	PartialWebexMeetingEntry,
} from "../webexMeetings/WebexMeetingDetail";

import MeetingEntryForm from "./MeetingEntry";
import ShowAccess from "../components/ShowAccess";
import { selectCalendarAccountDefaultId } from "../store/calendarAccounts";
import { selectWebexAccountDefaultId } from "../store/webexAccounts";

//const toTimeStr = (hour, min) => ('0' + hour).substr(-2) + ':' + ('0' + min).substr(-2);
const fromTimeStr = (str: string) => {
	const m = str.match(/(\d+):(\d+)/);
	return m
		? { hour: Number(m[1]), minute: Number(m[2]) }
		: { hour: 0, minute: 0 };
};

function timeRangeToDuration(startTime: string, endTime: string) {
	let d = DateTime.fromFormat(endTime, "HH:mm")
		.diff(DateTime.fromFormat(startTime, "HH:mm"))
		.shiftTo("hours", "minutes");
	if (d.hours < 0) d = d.plus({ hours: 24 });
	return d.toFormat(d.minutes ? "h:mm" : "h");
}

function endTimeFromDuration(startTime: string, duration: string) {
	let d = duration.trim();
	let m = /^(\d*):(\d{2})$/.exec(d);
	let dt = Duration.fromObject(
		m
			? { hours: m[1] ? Number(m[1]) : 0, minutes: Number(m[2]) }
			: { hours: Number(d) }
	);
	return DateTime.fromFormat(startTime, "HH:mm").plus(dt).toFormat("HH:mm");
}

const isSessionMeeting = (session: Session | undefined) =>
	session && (session.type === "p" || session.type === "i");

export type MeetingEntry = Omit<
	MeetingCreate,
	"id" | "start" | "end" | "webexMeeting"
> & {
	date: string;
	startTime: string;
	endTime: string;
	startSlotId: number | null;
	duration: string;
	webexMeeting?: WebexMeetingChange;
};

export type PartialMeetingEntry = Partial<
	Omit<MeetingEntry, "webexMeeting"> & {
		webexMeeting: PartialWebexMeetingEntry;
	}
>;

export type MultipleMeetingEntry = Multiple<
	Omit<MeetingEntry, "webexMeeting">
> & {
	dates: string[];
	slots: (string | null)[];
	webexMeeting?: MultipleWebexMeetingEntry;
};

function convertMeetingToEntry(
	meeting: SyncedMeeting,
	session?: Session
): MeetingEntry {
	let { start: startIn, end: endIn, webexMeeting, ...rest } = meeting;

	const zone =
		session && isSessionMeeting(session)
			? session.timezone
			: meeting.timezone;
	const start = DateTime.fromISO(startIn, { zone });
	const end = DateTime.fromISO(endIn, { zone });
	const date = start.toISODate()!;
	const startTime = start.toFormat("HH:mm");
	const endTime = end.toFormat("HH:mm");
	let startSlotId: Timeslot["id"] = 0;
	let roomId: Room["id"] | null = null;
	let duration: string = "";

	if (isSessionMeeting(session)) {
		roomId = meeting.roomId;
		if (roomId === null || roomId === undefined) {
			const room = session!.rooms.find(
				(r) => r.name === meeting.location
			);
			roomId = room ? room.id : 0;
		}

		let startSlot = session!.timeslots.find((s) => {
			const slotStart = start.set(fromTimeStr(s.startTime));
			const slotEnd = start.set(fromTimeStr(s.endTime));
			return start >= slotStart && start < slotEnd;
		});
		if (!startSlot) {
			// If we can't find a slot that includes the startTime then find best match
			startSlot = session!.timeslots.find((s) => {
				const slotStart = start.set(fromTimeStr(s.startTime));
				return start >= slotStart;
			});
		}
		startSlotId = startSlot ? startSlot.id : 0;
	} else {
		duration = timeRangeToDuration(startTime, endTime);
	}

	const entry: MeetingEntry = {
		...rest,
		date,
		startTime,
		endTime,
		startSlotId,
		roomId,
		duration,
	};

	if (webexMeeting)
		entry.webexMeeting = webexMeetingToWebexMeetingParams(webexMeeting);

	return entry;
}

export function convertEntryToMeeting(
	entry: MeetingEntry,
	session?: Session
): MeetingCreate {
	let { date, startTime, endTime, startSlotId, duration, ...rest } = entry;

	let zone;
	if (isSessionMeeting(session)) {
		zone = session!.timezone;
	} else {
		zone = entry.timezone;
		endTime = endTimeFromDuration(startTime, duration);
	}
	let start = DateTime.fromISO(date, { zone }).set(fromTimeStr(startTime));
	let end = DateTime.fromISO(date, { zone }).set(fromTimeStr(endTime));
	if (end < start) end = end.plus({ days: 1 });

	return {
		...rest,
		timezone: zone,
		start: start.toISO()!,
		end: end.toISO()!,
	};
}

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="placeholder">
		<span {...props} />
	</div>
);

type Actions = "add-by-slot" | "add-by-date" | "update";

type MeetingDetailsState = {
	action: Actions;
	entry: MultipleMeetingEntry;
	saved: MultipleMeetingEntry;
	session: Session | undefined;
	meetings: SyncedMeeting[];
	slots: string[];
	busy: boolean;
};

type MeetingDetailsProps = MeetingDetailsConnectedProps;

class MeetingDetails extends React.Component<
	MeetingDetailsProps,
	MeetingDetailsState
> {
	constructor(props: MeetingDetailsProps) {
		super(props);
		const { selectedMeetings, selectedSlots } = props;
		this.state = this.initState(
			selectedMeetings.length === 0 && selectedSlots.length > 0
				? "add-by-slot"
				: "update"
		);
	}

	componentDidUpdate() {
		const { selectedMeetings, setSelectedMeetings, selectedSlots } =
			this.props;
		const { action, meetings, slots } = this.state;
		const ids = meetings.map((m) => m.id);

		const changeWithConfirmation = async () => {
			if (this.hasUpdates()) {
				const ok = await ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				);
				if (!ok) {
					setSelectedMeetings(ids);
					return;
				}
			}
			this.reinitState(
				selectedMeetings.length === 0 && selectedSlots.length > 0
					? "add-by-slot"
					: "update"
			);
		};

		if (action === "update" && selectedMeetings.join() !== ids.join())
			changeWithConfirmation();
		else if (
			action === "add-by-slot" &&
			slots.length > 0 &&
			selectedSlots.join() !== slots.join()
		) {
			this.setState({ slots: selectedSlots });
		} else if (selectedSlots.join() !== slots.join())
			this.reinitState(
				selectedMeetings.length === 0 && selectedSlots.length > 0
					? "add-by-slot"
					: "update"
			);
	}

	initState = (action: Actions): MeetingDetailsState => {
		const {
			entities,
			selectedMeetings,
			selectedSlots,
			defaultWebexAccountId,
			defaultCalenderAccountId,
			groupId,
			session,
			groupEntities,
		} = this.props;

		const meetings = selectedMeetings
			.map((id) => entities[id])
			.filter(Boolean);

		let entry: MultipleMeetingEntry = meetings.reduce(
			(accumulatedEntry, meeting) => {
				const entry = convertMeetingToEntry(meeting, session);
				const timeslot = session?.timeslots.find(
					(s) => s.id === entry.startSlotId
				);
				const room = session?.rooms.find((r) => r.id === entry.roomId);
				const slot =
					timeslot && room
						? toSlotId(entry.date, timeslot, room)
						: null;
				return {
					...deepMergeTagMultiple(accumulatedEntry as {}, entry),
					dates: accumulatedEntry.dates.concat([entry.date]),
					slots: accumulatedEntry.slots.concat([slot]),
				};
			},
			{ dates: [], slots: [] } as any
		);
		entry.dates = [...new Set(entry.dates.sort())]; // array of unique dates

		if (action === "add-by-slot") {
			entry.slots = selectedSlots;

			let date: string | typeof MULTIPLE | null = null,
				roomId: number | typeof MULTIPLE | null = null,
				slotId: number | typeof MULTIPLE | null = null,
				dates: string[] = [];
			for (const id of selectedSlots) {
				const [date_, slotId_, roomId_] = fromSlotId(id);
				dates.push(date_);
				date = date !== null && date !== date_ ? MULTIPLE : date_;
				roomId =
					roomId !== null && roomId !== roomId_ ? MULTIPLE : roomId_;
				slotId =
					slotId !== null && slotId !== slotId_ ? MULTIPLE : slotId_;
			}
			entry.dates = [...new Set(dates)]; // Unique dates
			entry.roomId = roomId;
			entry.startSlotId = slotId;
			if (isMultiple(slotId)) {
				entry.startTime = MULTIPLE;
				entry.endTime = MULTIPLE;
			} else {
				const timeslot = session?.timeslots.find(
					(slot) => slot.id === slotId
				);
				entry.startTime = timeslot ? timeslot.startTime : "";
				entry.endTime = timeslot ? timeslot.endTime : "";
			}
			entry.hasMotions = false;
		} else if (action === "add-by-date") {
			if (meetings.length > 0) {
				entry = {
					...entry,
					startTime: isMultiple(entry.startTime)
						? ""
						: entry.startTime,
					endTime: isMultiple(entry.startTime) ? "" : entry.startTime,
					organizationId: isMultiple(entry.organizationId)
						? groupId
						: entry.organizationId,
					hasMotions: isMultiple(entry.hasMotions)
						? false
						: entry.hasMotions,
				};
			} else {
				entry = {
					...entry,
					dates: [],
					slots: [],
					startSlotId: 0,
					roomId: 0,
					startTime: "",
					endTime: "",
					duration: "",
					organizationId: groupId,
					hasMotions: false,
				};
			}
		}

		if (action !== "update") {
			entry.sessionId = session.id;
			entry.timezone = session.timezone;
			entry.isCancelled = false;
			const subgroup =
				entry.organizationId && groupEntities[entry.organizationId];
			entry.summary = subgroup ? subgroup.name : "";
			entry.webexAccountId = defaultWebexAccountId;
			entry.webexMeetingId = null;
			entry.calendarAccountId = defaultCalenderAccountId;
			entry.calendarEventId = null;
			entry.imatMeetingId = session ? session.imatMeetingId : null;
			entry.imatBreakoutId = null;
			entry.webexMeeting = {
				...defaultWebexMeeting,
				meetingOptions: defaultWebexMeeting.meetingOptions!,
				audioConnectionOptions:
					defaultWebexMeeting.audioConnectionOptions!,
				accountId: defaultWebexAccountId,
			};
		}

		return {
			action,
			entry,
			saved: entry,
			session,
			meetings,
			slots: selectedSlots,
			busy: false,
		};
	};

	reinitState = (action: Actions) => this.setState(this.initState(action));

	getUpdates = () => {
		let { entry, saved, session, meetings } = this.state;

		// Get modified local entry without dates[]
		let { dates, ...e } = entry;
		if (dates.length === 1) e.date = dates[0];

		// Find differences
		const diff = deepDiff(saved, e) as Partial<MeetingEntry>;
		const updates: MeetingUpdate[] = [];
		for (const meeting of meetings) {
			const local = deepMerge(
				convertMeetingToEntry(meeting, session),
				diff
			) as MeetingEntry;
			const updated = convertEntryToMeeting(local, session);
			const changes = deepDiff(
				meeting,
				updated
			) as MeetingUpdate["changes"];

			// If a (new) webex account is given, add a webex meeting
			if (changes.webexAccountId) changes.webexMeetingId = "$add";

			// If a (new) meeting ID is given, add a breakout
			if (changes.imatMeetingId) changes.imatBreakoutId = "$add";

			if (Object.keys(changes).length > 0)
				updates.push({ id: meeting.id, changes });
		}
		return updates;
	};

	hasUpdates = () => this.state.saved !== this.state.entry;

	changeEntry = (changes: PartialMeetingEntry) => {
		this.setState((state) => {
			let entry: MultipleMeetingEntry = deepMerge(state.entry, changes);
			// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
			//console.log(changes, entry)
			changes =
				(deepDiff(state.saved, entry) as PartialMeetingEntry) || {};
			if (Object.keys(changes).length === 0)
				entry = state.saved as typeof state.entry;
			return { ...state, entry };
		});
	};

	clickAdd = async () => {
		const { setSelectedMeetings } = this.props;
		const { action } = this.state;

		if (action === "update" && this.hasUpdates()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}

		this.reinitState("add-by-date");
		setSelectedMeetings([]);
	};

	clickDelete = async () => {
		const { deleteMeetings } = this.props;
		const { meetings } = this.state;
		const ids = meetings.map((m) => m.id);

		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the " +
				(ids.length > 1
					? ids.length + " selected entries?"
					: "selected entry?")
		);
		if (!ok) return;

		this.setState({ busy: true });
		await deleteMeetings(ids);
		this.reinitState("update");
	};

	clickSync = async () => {
		const { updateMeetings } = this.props;
		const { meetings, session } = this.state;
		//console.log(session)

		//const updates = meetings.map(m => ({id: m.id, changes: {}}));

		// Hack to ensure sessionId is set
		const updates = meetings.map((m) => {
			const changes: Partial<Meeting> = {};
			if (m.sessionId !== session!.id) changes.sessionId = session!.id;
			return { id: m.id, changes };
		});

		this.setState({ busy: true });
		await updateMeetings(updates);
		this.reinitState("update");
	};

	add = async () => {
		const { addMeetings, setSelectedMeetings, setSelectedSlots, session } =
			this.props;
		let { action, entry, slots } = this.state;

		// If a webex account is given, then add a webex meeting
		if (entry.webexAccountId) {
			entry = { ...entry, webexMeetingId: "$add" };
			if (entry.webexMeeting) entry.webexMeeting.publicMeeting = false;
		}

		// If an IMAT meeting ID is given then create a breakout
		if (entry.imatMeetingId) entry = { ...entry, imatBreakoutId: "$add" };

		let meetings: MeetingCreate[];
		if (action === "add-by-slot") {
			const { dates, startSlotId, startTime, endTime, roomId, ...rest } =
				entry;
			try {
				meetings = slots.map((id) => {
					const [date, startSlotId, roomId] = fromSlotId(id);
					const slot = session?.timeslots.find(
						(slot) => slot.id === startSlotId
					);
					if (!slot) throw new Error("Bad timeslot identifier");
					const startTime = slot.startTime;
					const endTime = slot.endTime;
					return convertEntryToMeeting(
						{
							...rest,
							date,
							startSlotId,
							startTime,
							endTime,
							roomId,
						} as MeetingEntry,
						session
					);
				});
			} catch (error: any) {
				this.props.setError("Internal error", error.message);
				meetings = [];
			}
		} else {
			const { dates, ...rest } = entry;
			meetings = dates.map((date) =>
				convertEntryToMeeting(
					{ ...rest, date } as MeetingEntry,
					session
				)
			);
		}

		this.setState({ busy: true });
		const ids = await addMeetings(meetings);
		setSelectedSlots([]);
		setSelectedMeetings(ids);
		this.reinitState("update");
	};

	update = async () => {
		const { updateMeetings } = this.props;

		const updates = this.getUpdates();
		//console.log(updates)

		this.setState({ busy: true });
		await updateMeetings(updates);
		this.reinitState("update");
	};

	cancel = async () => {
		const { setSelectedSlots } = this.props;
		setSelectedSlots([]);
		this.reinitState("update");
	};

	render() {
		const { session, loading, access } = this.props;
		const { action, entry, meetings, busy } = this.state;

		let notAvailableStr = "";
		if (loading) notAvailableStr = "Loading...";
		else if (action === "update" && meetings.length === 0)
			notAvailableStr = "Nothing selected";

		const readOnly = access <= AccessLevel.ro;

		const isSession = isSessionMeeting(session);

		let submit, cancel;
		let title = "";
		if (!notAvailableStr) title = isSession ? "Session meeting" : "Telecon";
		if (action === "add-by-slot" || action === "add-by-date") {
			submit = this.add;
			cancel = this.cancel;
			if (action === "add-by-slot") {
				title = "Add session meeting to selected slots";
			} else if (action === "add-by-date") {
				title = isSession ? "Add session meeting" : "Add telecon";
			}
		} else if (this.hasUpdates()) {
			submit = this.update;
			cancel = this.cancel;
			title = isSession ? "Update session meeting" : "Update telecon";
		}

		const actionButtons = (
			<div>
				<ActionButton
					name="upload"
					title="Sync meeting"
					disabled={
						meetings.length === 0 || loading || busy || readOnly
					}
					onClick={this.clickSync}
				/>
				<ActionButton
					name="add"
					title="Add meeting"
					disabled={
						action === "add-by-slot" || loading || busy || readOnly
					}
					isActive={action === "add-by-date"}
					onClick={this.clickAdd}
				/>
				<ActionButton
					name="delete"
					title="Delete meeting"
					disabled={
						meetings.length === 0 || loading || busy || readOnly
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
					<Placeholder>{notAvailableStr}</Placeholder>
				) : (
					<MeetingEntryForm
						entry={entry}
						changeEntry={this.changeEntry}
						busy={busy}
						action={action}
						submit={submit}
						cancel={cancel}
						readOnly={readOnly}
					/>
				)}
				<ShowAccess access={access} />
			</>
		);
	}
}

const connector = connect(
	(state: RootState) => ({
		groupId: selectTopLevelGroupId(state)!,
		session: selectCurrentSession(state)!,
		loading: selectMeetingsState(state).loading,
		selectedMeetings: selectSelectedMeetings(state),
		selectedSlots: selectSelectedSlots(state),
		entities: selectSyncedMeetingEntities(state),
		defaults: selectCurrentGroupDefaults(state),
		defaultCalenderAccountId: selectCalendarAccountDefaultId(state),
		defaultWebexAccountId: selectWebexAccountDefaultId(state),
		groupEntities: selectGroupEntities(state),
		access: selectUserMeetingsAccess(state),
	}),
	{
		setSelectedMeetings,
		setSelectedSlots,
		updateMeetings,
		addMeetings,
		deleteMeetings,
		setError,
	}
);

type MeetingDetailsConnectedProps = ConnectedProps<typeof connector>;

const ConnectedMeetingDetails = connector(MeetingDetails);

export default ConnectedMeetingDetails;
