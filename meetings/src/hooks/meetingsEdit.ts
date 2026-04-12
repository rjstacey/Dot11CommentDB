import { useCallback, useEffect, useReducer } from "react";
import isEqual from "lodash.isequal";
import {
	deepMergeTagMultiple,
	deepMerge,
	deepDiff,
	ConfirmModal,
	MULTIPLE,
	isMultiple,
	type Multiple,
} from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectGroupEntities, selectTopLevelGroupId } from "@/store/groups";
import { selectWebexAccountDefaultId } from "@/store/webexAccounts";
import { selectCalendarAccountDefaultId } from "@/store/calendarAccounts";

import { setError } from "@/store";
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
import {
	defaultWebexMeeting,
	type WebexMeetingEntryMultiple,
	type WebexMeetingEntryPartial,
} from "./webexMeetingsEdit";
import {
	convertEntryToMeeting,
	convertMeetingToEntry,
	defaultMeetingEntry,
	type MeetingEntry,
} from "./convertMeetingEntry";

export type MeetingEntryPartial = Partial<
	Omit<MeetingEntry, "webexMeeting"> & {
		webexMeeting: WebexMeetingEntryPartial;
	}
>;

export type MeetingEntryMultiple = Multiple<
	Omit<MeetingEntry, "webexMeeting">
> & {
	dates: string[];
	slots: string[];
	webexMeeting?: WebexMeetingEntryMultiple;
};

type MeetingsEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add-by-slot";
			edited: MeetingEntryMultiple;
			saved: undefined;
			//slots: string[];
	  }
	| {
			action: "add-by-date";
			edited: MeetingEntryMultiple;
			saved: undefined;
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
type MeetingsEditAction =
	| {
			type: "INIT";
	  }
	| {
			type: "CREATE";
	  }
	| {
			type: "CHANGE";
			changes: MeetingEntryPartial;
	  }
	| {
			type: "SUBMIT";
	  };
const INIT = { type: "INIT" } as const;
const CREATE = { type: "CREATE" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (changes: MeetingEntryPartial) =>
	({ type: "CHANGE", changes }) as const;

function useMeetingsEditReducer() {
	const { loading, valid } = useAppSelector(selectMeetingsState);
	const entities = useAppSelector(selectSyncedMeetingEntities);
	const selectedMeetings = useAppSelector(selectSelectedMeetings);
	const selectedSlots = useAppSelector(selectSelectedSlots);
	const session = useAppSelector(selectCurrentSession);
	const defaultWebexAccountId = useAppSelector(selectWebexAccountDefaultId);
	const defaultCalenderAccountId = useAppSelector(
		selectCalendarAccountDefaultId,
	);
	const groupId = useAppSelector(selectTopLevelGroupId)!;
	const groupEntities = useAppSelector(selectGroupEntities);

	const initState = useCallback(() => {
		const meetings = selectedMeetings
			.map((id) => entities[id])
			.filter(Boolean);

		if (!session) throw new Error("No current session");

		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
				session,
			} satisfies MeetingsEditState;
		} else if (meetings.length === 0 && selectedSlots.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
				session,
			} satisfies MeetingsEditState;
		} else if (meetings.length === 0 && selectedSlots.length > 0) {
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
				const timeslot = session.timeslots.find(
					(slot) => slot.id === slotId,
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
				isSessionMeeting: true,
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
				//slots: selectedSlots,
				session,
			} satisfies MeetingsEditState;
		} else {
			const entry: MeetingEntryMultiple = meetings.reduce(
				(accumulatedEntry, meeting) => {
					const entry = convertMeetingToEntry(meeting, session);
					const slot = toSlotId(
						entry.date,
						entry.startSlotId || 0,
						entry.roomId || 0,
					);
					return {
						...(deepMergeTagMultiple(
							accumulatedEntry,
							entry,
						) as MeetingEntryMultiple),
						dates: accumulatedEntry.dates.concat([entry.date]),
						slots: accumulatedEntry.slots.concat([slot]),
					};
				},
				{ dates: [], slots: [] } as unknown as MeetingEntryMultiple,
			);
			entry.dates = [...new Set(entry.dates.sort())]; // array of unique dates
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

	const createState = useCallback(
		(state: MeetingsEditState) => {
			let edited: MeetingEntryMultiple;
			if (state.action === "update") {
				const entry = state.edited;
				edited = {
					...entry,
					startTime: isMultiple(entry.startTime)
						? ""
						: entry.startTime,
					endTime: isMultiple(entry.endTime) ? "" : entry.endTime,
					organizationId: isMultiple(entry.organizationId)
						? groupId
						: entry.organizationId,
					hasMotions: isMultiple(entry.hasMotions)
						? false
						: entry.hasMotions,
				};
			} else {
				if (!session) throw new Error("No current session");
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
					isSessionMeeting:
						session.type === "p" || session.type === "i",
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
			}
			return {
				...state,
				action: "add-by-date",
				edited,
				saved: undefined,
			} satisfies MeetingsEditState;
		},
		[defaultWebexAccountId, defaultCalenderAccountId, session, groupId],
	);

	const reducer = useCallback(
		(
			state: MeetingsEditState,
			action: MeetingsEditAction,
		): MeetingsEditState => {
			if (action.type === "INIT") {
				return initState();
			}
			if (action.type === "CREATE") {
				return createState(state);
			}
			if (action.type === "CHANGE") {
				if (
					state.action === "add-by-date" ||
					state.action === "add-by-slot"
				) {
					const edited: MeetingEntryMultiple = deepMerge(
						state.edited,
						action.changes,
					);
					return { ...state, edited } satisfies MeetingsEditState;
				} else if (state.action === "update") {
					let edited: MeetingEntryMultiple = deepMerge(
						state.edited,
						action.changes,
					);
					// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
					const changes = deepDiff(state.saved, edited) || {};
					if (Object.keys(changes).length === 0) edited = state.saved;
					return { ...state, edited } satisfies MeetingsEditState;
				}
				return state;
			}
			if (action.type === "SUBMIT") {
				if (
					state.action === "add-by-date" ||
					state.action === "add-by-slot"
				) {
					return {
						...state,
						action: null,
						message: "Adding...",
					};
				} else if (state.action === "update") {
					return {
						...state,
						saved: state.edited,
					};
				}
				return state;
			}
			console.error("Unknown action:", action);
			return state;
		},
		[initState, createState],
	);

	return useReducer(reducer, undefined, initState);
}

export function useMeetingsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const selectedMeetings = useAppSelector(selectSelectedMeetings);
	const selectedSlots = useAppSelector(selectSelectedSlots);

	const [state, dispatchStateAction] = useMeetingsEditReducer();

	useEffect(() => {
		if (state.action === "add-by-date") {
			if (selectedMeetings.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelectedMeetings([]));
				});
			} else if (selectedSlots.length > 0) {
				dispatchStateAction(INIT);
			}
		} else if (state.action === "add-by-slot") {
			dispatchStateAction(INIT);
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				dispatchStateAction(INIT);
				return;
			}
			const ids = state.meetings.map((m) => m.id);
			if (!isEqual(selectedMeetings, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelectedMeetings(ids));
				});
			}
		} else {
			dispatchStateAction(INIT);
		}
	}, [selectedMeetings, selectedSlots, dispatchStateAction]);

	const hasChanges = useCallback(
		() =>
			state.action === "add-by-date" ||
			state.action === "add-by-slot" ||
			(state.action === "update" && state.edited !== state.saved),
		[state],
	);

	const onChange = useCallback(
		(changes: MeetingEntryPartial) => {
			if (readOnly || state.action === null) {
				console.warn("onChange: bad state");
				return;
			}
			dispatchStateAction(CHANGE(changes));
		},
		[readOnly, state.action, dispatchStateAction],
	);

	const submit = useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "add-by-date" || state.action === "add-by-slot") {
			const { action, session } = state;
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
				//const { slots } = state;
				const {
					dates,
					slots,
					startSlotId,
					startTime,
					endTime,
					roomId,
					...rest
				} = entry;
				try {
					meetings = slots.map((id) => {
						const [date, startSlotId, roomId] = fromSlotId(id);
						const slot = session.timeslots.find(
							(slot) => slot.id === startSlotId,
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
							session,
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
						session,
					),
				);
			}

			const ids = await dispatch(addMeetings(meetings));
			dispatchStateAction(SUBMIT);
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
					diff,
				) as MeetingEntry;
				const updated = convertEntryToMeeting(local, session);
				const changes = deepDiff(
					meeting,
					updated,
				) as MeetingUpdate["changes"];

				// If a (new) webex account is given, add a webex meeting
				if (changes.webexAccountId) changes.webexMeetingId = "$add";

				// If a (new) meeting ID is given, add a breakout
				if (changes.imatMeetingId) changes.imatBreakoutId = "$add";

				if (Object.keys(changes).length > 0)
					updates.push({ id: meeting.id, changes });
			}
			await dispatch(updateMeetings(updates));
			dispatchStateAction(SUBMIT);
		}
	}, [readOnly, state, dispatch, dispatchStateAction]);

	const cancel = useCallback(() => {
		dispatchStateAction(INIT);
	}, [dispatchStateAction]);

	const onAdd = useCallback(async () => {
		if (readOnly) {
			console.warn("onAdd: bad state");
			return;
		}
		if (state.action === "update" && hasChanges()) {
			const ok = await ConfirmModal.show(
				`Changes not applied! Do you want to discard changes?`,
			);
			if (!ok) return;
		}
		dispatchStateAction(CREATE);
		dispatch(setSelectedMeetings([]));
	}, [readOnly, dispatch, dispatchStateAction]);

	const onDelete = useCallback(async () => {
		if (readOnly || state.action !== "update") {
			console.warn("onDelete: bad state");
			return;
		}

		const ids = state.meetings.map((m) => m.id);
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the selected " +
				(ids.length > 1 ? ids.length + "entries?" : "entry?"),
		);
		if (!ok) return;
		dispatchStateAction(SUBMIT);
		await dispatch(deleteMeetings(ids));
		dispatch(setSelectedMeetings([]));
	}, [readOnly, state, dispatch, dispatchStateAction]);

	const onSync = useCallback(async () => {
		if (readOnly || state.action !== "update") {
			console.warn("onSync: bad state");
			return;
		}

		const { meetings, session } = state;
		// Hack to ensure sessionId is set
		const updates = meetings.map((m) => {
			const changes: Partial<Meeting> = {};
			if (m.sessionId !== session.id) changes.sessionId = session.id;
			return { id: m.id, changes };
		});
		dispatchStateAction(SUBMIT);
		await dispatch(updateMeetings(updates));
	}, [readOnly, state, dispatch]);

	return {
		state,
		hasChanges,
		onChange,
		submit,
		cancel,
		onSync,
		onAdd,
		onDelete,
	};
}
