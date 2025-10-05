import * as React from "react";
import { connect, ConnectedProps } from "react-redux";
import { Row, Col, Button, Container } from "react-bootstrap";
import {
	ConfirmModal,
	deepDiff,
	deepMerge,
	deepMergeTagMultiple,
	isMultiple,
	MULTIPLE,
	setError,
} from "@common";

import type { RootState } from "@/store";
import { selectCurrentGroupDefaults } from "@/store/current";
import { selectGroupEntities, selectTopLevelGroupId } from "@/store/groups";
import {
	selectUserMeetingsAccess,
	SyncedMeeting,
	MeetingUpdate,
} from "@/store/meetings";
import { AccessLevel } from "@/store/user";

import {
	selectCurrentSession,
	fromSlotId,
	Session,
	toSlotId,
} from "@/store/sessions";

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
} from "@/store/meetings";
import { selectCalendarAccountDefaultId } from "@/store/calendarAccounts";
import { selectWebexAccountDefaultId } from "@/store/webexAccounts";

import ShowAccess from "@/components/ShowAccess";

import { defaultWebexMeeting } from "../webexMeetings/convertWebexMeetingEntry";

import MeetingEntryForm from "./MeetingEntry";
import {
	convertEntryToMeeting,
	convertMeetingToEntry,
	isSessionMeeting,
	type MeetingEntry,
	type MultipleMeetingEntry,
	type PartialMeetingEntry,
} from "./convertMeetingEntry";

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

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="placeholder">
		<span {...props} />
	</div>
);

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
					...deepMergeTagMultiple(accumulatedEntry as {}, entry), // eslint-disable-line @typescript-eslint/no-empty-object-type
					dates: accumulatedEntry.dates.concat([entry.date]),
					slots: accumulatedEntry.slots.concat([slot]),
				};
			},
			{ dates: [], slots: [] } as any // eslint-disable-line @typescript-eslint/no-explicit-any
		);
		entry.dates = [...new Set(entry.dates.sort())]; // array of unique dates

		if (action === "add-by-slot") {
			entry.slots = selectedSlots;

			let date: string | typeof MULTIPLE | null = null,
				roomId: number | typeof MULTIPLE | null = null,
				slotId: number | typeof MULTIPLE | null = null;
			const dates: string[] = [];
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
		const { entry, saved, session, meetings } = this.state;

		// Get modified local entry without dates[]
		const { dates, ...e } = entry;
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
		const { action, slots } = this.state;
		let { entry } = this.state;

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
			} catch (error: unknown) {
				let message = "Unknown";
				if (error instanceof Error) message = error.message;
				this.props.setError("Internal error", message);
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
			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				<Button
					variant="outline-primary"
					className="bi-cloud-upload"
					title="Sync meeting"
					disabled={
						meetings.length === 0 || loading || busy || readOnly
					}
					onClick={this.clickSync}
				>
					{" Sync"}
				</Button>
				<Button
					variant="outline-primary"
					className="bi-plus-lg"
					title="Add meeting"
					disabled={
						action === "add-by-slot" || loading || busy || readOnly
					}
					active={action === "add-by-date"}
					onClick={this.clickAdd}
				>
					{" Add"}
				</Button>
				<Button
					variant="outline-primary"
					className="bi-trash"
					title="Delete meeting"
					disabled={
						meetings.length === 0 || loading || busy || readOnly
					}
					onClick={this.clickDelete}
				>
					{" Delete"}
				</Button>
			</Col>
		);

		return (
			<Container fluid>
				<Row className="mb-3">
					<Col>
						<h3 className="title">{title}</h3>
					</Col>
					{actionButtons}
				</Row>
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
			</Container>
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
