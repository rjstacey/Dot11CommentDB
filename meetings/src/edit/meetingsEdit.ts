import React from "react";
import isEqual from "lodash.isequal";
import {
	deepMergeTagMultiple,
	deepMerge,
	deepDiff,
	ConfirmModal,
	MULTIPLE,
	isMultiple,
	setError,
} from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectGroupEntities, selectTopLevelGroupId } from "@/store/groups";
import { selectWebexAccountDefaultId } from "@/store/webexAccounts";
import { selectCalendarAccountDefaultId } from "@/store/calendarAccounts";

import {
	selectMeetingsState,
	selectSyncedMeetingEntities,
	selectSelectedMeetings,
	selectSelectedSlots,
	setSelectedMeetings,
	setSelectedSlots,
	addMeetings,
	updateMeetings,
	deleteMeetings,
	Meeting,
	MeetingCreate,
	MeetingUpdate,
	SyncedMeeting,
} from "@/store/meetings";
import {
	selectCurrentSession,
	fromSlotId,
	toSlotId,
	type Session,
} from "@/store/sessions";
import { defaultWebexMeeting } from "./convertWebexMeetingEntry";
import {
	convertEntryToMeeting,
	convertMeetingToEntry,
	defaultMeetingEntry,
	type MeetingEntry,
	type MeetingEntryPartial,
	type MeetingEntryMultiple,
} from "./convertMeetingEntry";

type MeetingsEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add-by-date" | "add-by-slot";
			edited: MeetingEntryMultiple;
			saved: undefined;
			slots: string[];
	  }
	| {
			action: "update";
			edited: MeetingEntryMultiple;
			saved: MeetingEntryMultiple;
			meetings: SyncedMeeting[];
	  }
) & {
	session: Session;
};

function useMeetingsEditState() {
	const dispatch = useAppDispatch();
	const { loading, valid } = useAppSelector(selectMeetingsState);
	const entities = useAppSelector(selectSyncedMeetingEntities);
	const selectedMeetings = useAppSelector(selectSelectedMeetings);
	const selectedSlots = useAppSelector(selectSelectedSlots);
	const session = useAppSelector(selectCurrentSession)!;
	const defaultWebexAccountId = useAppSelector(selectWebexAccountDefaultId);
	const defaultCalenderAccountId = useAppSelector(
		selectCalendarAccountDefaultId
	);
	const groupId = useAppSelector(selectTopLevelGroupId)!;
	const groupEntities = useAppSelector(selectGroupEntities);

	const initState = React.useCallback(() => {
		const meetings = selectedMeetings
			.map((id) => entities[id])
			.filter(Boolean);

		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
				session,
			} satisfies MeetingsEditState;
		}
		if (meetings.length === 0 && selectedSlots.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
				session,
			} satisfies MeetingsEditState;
		}
		if (meetings.length === 0 && selectedSlots.length > 0) {
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
			let startTime: string, endTime: string;
			if (isMultiple(slotId)) {
				startTime = MULTIPLE;
				endTime = MULTIPLE;
			} else {
				const timeslot = session?.timeslots.find(
					(slot) => slot.id === slotId
				);
				startTime = timeslot ? timeslot.startTime : "";
				endTime = timeslot ? timeslot.endTime : "";
			}

			const entry: MeetingEntryMultiple = {
				...defaultMeetingEntry,
				date: dates[0],
				dates: [...new Set(dates)], // Unique dates
				slots: selectedSlots,
				roomId,
				startSlotId: slotId,
				sessionId: session.id,
				timezone: session.timezone,
				startTime,
				endTime,
				organizationId: groupId,
				webexAccountId: defaultWebexAccountId,
				calendarAccountId: defaultCalenderAccountId,
				imatMeetingId: session.imatMeetingId,
				webexMeeting: {
					id: "",
					...defaultWebexMeeting,
					accountId: defaultWebexAccountId,
				},
			};
			return {
				action: "add-by-slot",
				edited: entry,
				saved: undefined,
				slots: selectedSlots,
				session,
			} satisfies MeetingsEditState;
		} else {
			const entry: MeetingEntryMultiple = meetings.reduce(
				(accumulatedEntry, meeting) => {
					const entry = convertMeetingToEntry(meeting, session);
					const timeslot = session?.timeslots.find(
						(s) => s.id === entry.startSlotId
					);
					const room = session?.rooms.find(
						(r) => r.id === entry.roomId
					);
					const slot =
						timeslot && room
							? toSlotId(entry.date, timeslot, room)
							: null;
					return {
						...(deepMergeTagMultiple(
							accumulatedEntry,
							entry
						) as MeetingEntryMultiple),
						dates: accumulatedEntry.dates.concat([entry.date]),
						slots: accumulatedEntry.slots.concat([slot]),
					};
				},
				{ dates: [], slots: [] } as unknown as MeetingEntryMultiple
			);
			entry.dates = [...new Set(entry.dates.sort())]; // array of unique dates
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
			entry.imatGracePeriod = 10;
			entry.webexMeeting = {
				id: "",
				...defaultWebexMeeting,
				accountId: defaultWebexAccountId,
			};
			return {
				action: "update",
				edited: entry,
				saved: entry,
				meetings,
				session,
			} satisfies MeetingsEditState;
		}
	}, [
		loading,
		valid,
		selectedMeetings,
		selectedSlots,
		entities,
		session,
		defaultWebexAccountId,
		defaultCalenderAccountId,
		groupId,
		groupEntities,
	]);

	const resetState = React.useCallback(
		() => setState(initState),
		[initState]
	);

	React.useEffect(() => {
		if (state.action === "add-by-date" || state.action === "add-by-slot") {
			if (selectedMeetings.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelectedMeetings([]));
				});
			}
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				resetState();
				return;
			}
			const ids = state.meetings.map((m) => m.id);
			if (!isEqual(selectedMeetings, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelectedMeetings(ids));
				});
			}
		} else {
			resetState();
		}
	}, [selectedMeetings, resetState]);

	const [state, setState] = React.useState<MeetingsEditState>(initState);

	return [state, setState, resetState] as const;
}

export function useMeetingsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const groupId = useAppSelector(selectTopLevelGroupId)!;

	const [state, setState, resetState] = useMeetingsEditState();

	const hasChanges = React.useCallback(
		() =>
			state.action === "add-by-date" ||
			state.action === "add-by-slot" ||
			(state.action === "update" && state.edited !== state.saved),
		[state]
	);

	const onChange = React.useCallback(
		(changes: MeetingEntryPartial) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChange: state is readOnly");
					return state;
				}
				if (
					state.action === "add-by-date" ||
					state.action === "add-by-slot"
				) {
					const edited: MeetingEntryMultiple = deepMerge(
						state.edited,
						changes
					);
					return { ...state, edited } satisfies MeetingsEditState;
				} else if (state.action === "update") {
					let edited: MeetingEntryMultiple = deepMerge(
						state.edited,
						changes
					);
					// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
					changes = deepDiff(state.saved, edited) || {};
					if (Object.keys(changes).length === 0) edited = state.saved;
					return { ...state, edited } satisfies MeetingsEditState;
				}
				console.warn("onChange: in unexpected state");
				return state;
			});
		},
		[readOnly, setState]
	);

	const submit = React.useCallback(async () => {
		if (state.action === "add-by-date" || state.action === "add-by-slot") {
			const { action, slots, session } = state;
			let entry = state.edited;

			// If a webex account is given, then add a webex meeting
			if (entry.webexAccountId) {
				entry = { ...entry, webexMeetingId: "$add" };
				if (entry.webexMeeting)
					entry.webexMeeting.publicMeeting = false;
			}

			// If an IMAT meeting ID is given then create a breakout
			if (entry.imatMeetingId)
				entry = { ...entry, imatBreakoutId: "$add" };

			let meetings: MeetingCreate[];
			if (action === "add-by-slot") {
				const {
					dates,
					startSlotId,
					startTime,
					endTime,
					roomId,
					...rest
				} = entry;
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
					dispatch(setError("Internal error", message));
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

			const ids = await dispatch(addMeetings(meetings));
			dispatch(setSelectedSlots([]));
			dispatch(setSelectedMeetings(ids));
		} else if (state.action === "update") {
			const { edited, saved, session, meetings } = state;

			// Get modified local entry without dates[]
			const { dates, ...e } = edited;
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
			setState({ ...state, saved: state.edited });
		}
	}, []);

	const onAdd = React.useCallback(async () => {
		if (readOnly) {
			console.warn("onAdd: state is readOnly");
			return;
		}
		if (state.action === "update" && hasChanges()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`
			);
			if (!ok) return;
		}
		let edited: MeetingEntryMultiple;
		if (state.action === "update") {
			const entry = state.edited;
			edited = {
				...entry,
				startTime: isMultiple(entry.startTime) ? "" : entry.startTime,
				endTime: isMultiple(entry.startTime) ? "" : entry.startTime,
				organizationId: isMultiple(entry.organizationId)
					? groupId
					: entry.organizationId,
				hasMotions: isMultiple(entry.hasMotions)
					? false
					: entry.hasMotions,
			};
		} else {
			edited = {
				...defaultMeetingEntry,
				date: "",
				dates: [],
				slots: [],
				startSlotId: 0,
				roomId: 0,
				startTime: "",
				endTime: "",
				duration: "",
				organizationId: groupId,
				webexMeeting: {
					id: "",
					...defaultWebexMeeting,
					accountId: null,
				},
			};
		}
		setState((state) => ({
			...state,
			action: "add-by-date",
			edited,
			saved: undefined,
			slots: [],
		}));
		dispatch(setSelectedMeetings([]));
	}, [readOnly, dispatch]);

	const onDelete = React.useCallback(async () => {
		if (readOnly) {
			console.warn("onDelete: state is readOnly");
			return;
		}
		if (state.action !== "update") {
			console.warn("onDelete: in unexpected state");
			return;
		}

		const ids = state.meetings.map((m) => m.id);
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the selected " +
				(ids.length > 1 ? ids.length + "entries?" : "entry?")
		);
		if (!ok) return;
		await dispatch(deleteMeetings(ids));
	}, [dispatch]);

	const onSync = React.useCallback(async () => {
		if (readOnly) {
			console.warn("onSync: state is readOnly");
			return;
		}
		if (state.action !== "update") {
			console.warn("onSync: in unexpected state");
			return;
		}
		const { meetings, session } = state;
		// Hack to ensure sessionId is set
		const updates = meetings.map((m) => {
			const changes: Partial<Meeting> = {};
			if (m.sessionId !== session!.id) changes.sessionId = session!.id;
			return { id: m.id, changes };
		});

		await dispatch(updateMeetings(updates));
	}, [dispatch]);

	return {
		state,
		hasChanges,
		onChange,
		submit,
		cancel: resetState,
		onSync,
		onAdd,
		onDelete,
	};
}
