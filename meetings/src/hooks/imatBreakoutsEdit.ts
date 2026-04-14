import { useCallback, useEffect, useReducer } from "react";
import { DateTime } from "luxon";
import isEqual from "lodash.isequal";
import {
	deepMergeTagMultiple,
	deepMerge,
	deepDiff,
	ConfirmModal,
	type Multiple,
} from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectGroupEntities,
	selectTopLevelGroupId,
	type Group,
} from "@/store/groups";
import {
	selectBreakoutsState,
	selectSyncedBreakoutEntities,
	selectBreakoutMeetingId,
	setSelectedBreakouts as setSelected,
	addBreakouts,
	updateBreakouts,
	deleteBreakouts,
	type SyncedBreakout,
	type Breakout,
} from "@/store/imatBreakouts";
import { selectImatMeeting, type ImatMeeting } from "@/store/imatMeetings";
import { addMeetings, updateMeetings } from "@/store/meetings";
import { selectSessionByImatMeetingId, type Session } from "@/store/sessions";
import {
	convertEntryToMeeting,
	startSlotBestMatch,
	type MeetingEntry,
} from "./convertMeetingEntry";
import type { MeetingEntryMultiple, MeetingEntryPartial } from "./meetingsEdit";

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
	facilitator: "",
});

function convertBreakoutToMeetingEntry(
	breakout: Breakout,
	imatMeeting: ImatMeeting,
	session: Session,
	groupId: string,
	groupEntities: Record<string, Group>,
) {
	const start = DateTime.fromFormat(
		`${imatMeeting.start} ${breakout.startTime}`,
		"yyyy-MM-dd HH:mm",
		{ zone: imatMeeting.timezone },
	).plus({ days: breakout.day });
	//const end = DateTime.fromFormat(`${imatMeeting.start} ${breakout.endTime}`, 'yyyy-MM-dd HH:mm', {zone: imatMeeting.timezone}).plus({days: breakout.day});

	const groups = Object.values(groupEntities) as Group[];
	const bNameRe = new RegExp(breakout.name, "i");
	const group =
		groups.find(
			(g) => g.name.toLowerCase() === breakout.name.toLowerCase(),
		) || // near exact match
		groups.find((g) => breakout.name.match(new RegExp(g.name, "i"))) || // case invariant substring match
		groups.find((g) => g.name.match(bNameRe)); // both ways

	const organizationId = group?.id || groupId;

	const entry: MeetingEntryMultiple = {
		summary: breakout.name,
		//start: start.toISO(),
		//end: end.toISO(),
		date: start.toISODate()!,
		dates: [start.toISODate()!],
		slots: [],
		isSessionMeeting: true,
		startTime: breakout.startTime,
		endTime: breakout.endTime,
		startSlotId: null,
		duration: "",
		location: breakout.location,
		organizationId,
		hasMotions: false,
		isCancelled: false,
		timezone: session.timezone,
		calendarAccountId: null,
		calendarEventId: null,
		webexAccountId: null,
		webexMeetingId: null,
		//webexMeeting: {accountId: null},
		imatMeetingId: imatMeeting.id,
		imatBreakoutId: breakout.id,
		imatGracePeriod: 0,
		sessionId: session.id,
		roomId: null,
	};

	const room = session.rooms.find((r) => r.name === breakout.location);
	if (room && room.id) {
		entry.roomId = room.id;
		entry.location = "";
	}

	// Find slot with the closest startTime
	const startSlot = startSlotBestMatch(session, start);
	if (startSlot) entry.startSlotId = startSlot.id;

	//console.log(entry)
	return entry;
}

export type BreakoutEntryMultiple = Multiple<SyncedBreakout>;
export type BreakoutEntryPartial = Partial<SyncedBreakout>;

type ImatBreakoutsEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "import";
			edited: MeetingEntryMultiple;
			saved: undefined;
			session: Session;
	  }
	| {
			action: "add";
			edited: SyncedBreakout;
			saved: undefined;
	  }
	| {
			action: "update";
			edited: BreakoutEntryMultiple;
			saved: BreakoutEntryMultiple;
	  }
) & {
	imatMeetingId: number | null;
	breakouts: SyncedBreakout[];
};
type BreakoutsEditAction =
	| {
			type: "INIT" | "CREATE" | "IMPORT" | "SUBMIT";
	  }
	| {
			type: "CHANGE_BREAKOUT";
			changes: BreakoutEntryPartial;
	  }
	| {
			type: "CHANGE_MEETING";
			changes: MeetingEntryPartial;
	  };
const INIT = { type: "INIT" } as const;
const CREATE = { type: "CREATE" } as const;
const IMPORT = { type: "IMPORT" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE_BREAKOUT = (changes: BreakoutEntryPartial) =>
	({ type: "CHANGE_BREAKOUT", changes }) as const;
const CHANGE_MEETING = (changes: MeetingEntryPartial) =>
	({ type: "CHANGE_MEETING", changes }) as const;

function useImatBreakoutsEditReducer() {
	const { loading, valid, selected } = useAppSelector(selectBreakoutsState);
	const entities = useAppSelector(selectSyncedBreakoutEntities);
	const groupId = useAppSelector(selectTopLevelGroupId)!;
	const groupEntities = useAppSelector(selectGroupEntities);

	const imatMeetingId = useAppSelector(selectBreakoutMeetingId);
	const imatMeeting = useAppSelector((state) =>
		imatMeetingId ? selectImatMeeting(state, imatMeetingId) : undefined,
	);
	const session = useAppSelector((state) =>
		imatMeetingId
			? selectSessionByImatMeetingId(state, imatMeetingId)
			: undefined,
	);

	const init = useCallback(() => {
		const breakouts = selected.map((id) => entities[id]).filter(Boolean);
		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
				imatMeetingId,
				breakouts,
			} satisfies ImatBreakoutsEditState;
		}
		if (breakouts.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
				imatMeetingId,
				breakouts,
			} satisfies ImatBreakoutsEditState;
		} else {
			const entry = breakouts.reduce(
				(entry, breakout) => deepMergeTagMultiple(entry, breakout),
				{},
			) as BreakoutEntryMultiple;
			return {
				action: "update",
				edited: entry,
				saved: entry,
				imatMeetingId,
				breakouts,
			} satisfies ImatBreakoutsEditState;
		}
	}, [loading, valid, selected, entities, imatMeetingId]);

	const importState = useCallback(
		(state: ImatBreakoutsEditState) => {
			if (!imatMeeting) {
				console.warn("import: can't find IMAT meeting");
				return state;
			}
			if (!session) {
				console.warn("import: can't find session");
				return state;
			}
			const breakout = state.breakouts[0];
			const edited = convertBreakoutToMeetingEntry(
				breakout,
				imatMeeting,
				session,
				groupId,
				groupEntities,
			);
			return {
				...state,
				action: "import",
				edited,
				saved: undefined,
				session,
			} satisfies ImatBreakoutsEditState;
		},
		[imatMeeting, session, groupId, groupEntities],
	);

	const reducer = useCallback(
		(
			state: ImatBreakoutsEditState,
			action: BreakoutsEditAction,
		): ImatBreakoutsEditState => {
			if (action.type === "INIT") {
				return init();
			}
			if (action.type === "CREATE") {
				const edited: SyncedBreakout = {
					...getDefaultBreakout(),
					imatMeetingId: state.imatMeetingId,
					meetingId: null,
				};
				return {
					...state,
					action: "add",
					edited,
					saved: undefined,
				};
			}
			if (action.type === "IMPORT") {
				return importState(state);
			}
			if (action.type === "CHANGE_BREAKOUT") {
				if (state.action === "add") {
					return {
						...state,
						edited: { ...state.edited, ...action.changes },
					} satisfies ImatBreakoutsEditState;
				} else if (state.action === "update") {
					let edited = { ...state.edited, ...action.changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return {
						...state,
						edited,
					} satisfies ImatBreakoutsEditState;
				}
				return state;
			}
			if (action.type === "CHANGE_MEETING") {
				if (state.action !== "import") {
					console.warn("CHANGE_MEETING: unexpected state");
					return state;
				}
				const edited: MeetingEntryMultiple = deepMerge(
					state.edited,
					action.changes,
				);
				return { ...state, edited } satisfies ImatBreakoutsEditState;
			}
			if (action.type === "SUBMIT") {
				if (state.action === "add") {
					return {
						...state,
						action: null,
						message: "Adding...",
					} satisfies ImatBreakoutsEditState;
				} else if (state.action === "update") {
					return {
						...state,
						saved: state.edited,
					} satisfies ImatBreakoutsEditState;
				} else if (state.action === "import") {
					return {
						...state,
						action: null,
						message: "Importing...",
					} satisfies ImatBreakoutsEditState;
				}
				return state;
			}
			console.error("Unknown action:", action);
			return state;
		},
		[init, importState],
	);

	return useReducer(reducer, undefined, init);
}

export function useImatBreakoutsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectBreakoutsState);

	const [state, dispatchStateAction] = useImatBreakoutsEditReducer();

	useEffect(() => {
		if (state.action === "add" || state.action === "import") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				dispatchStateAction(INIT);
				return;
			}
			const ids = state.breakouts.map((m) => m.id);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelected(ids));
				});
			}
		} else {
			dispatchStateAction(INIT);
		}
	}, [selected, dispatchStateAction]);

	const hasChanges = useCallback(
		() =>
			state.action === "add" ||
			state.action === "import" ||
			(state.action === "update" && state.edited !== state.saved),
		[state],
	);

	const onChangeMeeting = useCallback(
		(changes: MeetingEntryPartial) => {
			if (readOnly || state.action !== "import") {
				console.warn("onChange: bad state");
				return;
			}
			dispatchStateAction(CHANGE_MEETING(changes));
		},
		[readOnly, dispatchStateAction],
	);

	const onChangeBreakout = useCallback(
		(changes: BreakoutEntryPartial) => {
			if (
				readOnly ||
				(state.action !== "add" && state.action !== "update")
			) {
				console.warn("onChangeBreakout: bad state");
				return;
			}
			dispatchStateAction(CHANGE_BREAKOUT(changes));
		},
		[readOnly, state.action, dispatchStateAction],
	);

	const submit = useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		if (state.action === "import") {
			let entry = state.edited;

			// If a webex account is given, then add a webex meeting
			if (entry.webexAccountId) {
				entry = { ...entry, webexMeetingId: "$add" };
				if (entry.webexMeeting)
					entry.webexMeeting.publicMeeting = false;
			}

			const { dates, ...rest } = entry;
			const meetings = dates.map((date) =>
				convertEntryToMeeting(
					{ ...rest, date } as MeetingEntry,
					state.session,
				),
			);
			await dispatch(addMeetings(meetings));
		} else if (state.action === "add") {
			const entry = state.edited;
			const imatMeetingId = state.imatMeetingId;
			const [id] = await dispatch(addBreakouts(imatMeetingId!, [entry]));
			if (entry.meetingId) {
				await dispatch(
					updateMeetings([
						{
							id: entry.meetingId,
							changes: { imatMeetingId, imatBreakoutId: id },
						},
					]),
				);
			}
			dispatchStateAction(SUBMIT);
			dispatch(setSelected([id]));
		} else if (state.action === "update") {
			const { edited: entry, saved, imatMeetingId, breakouts } = state;

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
			if (breakoutUpdates.length > 0) {
				await dispatch(
					updateBreakouts(imatMeetingId!, breakoutUpdates),
				);
			}
			if (meetingUpdates.length > 0) {
				await dispatch(updateMeetings(meetingUpdates));
			}
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
		dispatch(setSelected([]));
	}, [readOnly, state.action, hasChanges, dispatchStateAction, dispatch]);

	const onDelete = useCallback(async () => {
		if (readOnly || state.action !== "update") {
			console.warn("onDelete: bad state");
			return;
		}
		const ids = state.breakouts.map((m) => m.id);
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the selected " +
				(ids.length > 1 ? ids.length + "entries?" : "entry?"),
		);
		if (!ok) return;
		await dispatch(deleteBreakouts(state.imatMeetingId!, ids));
		dispatchStateAction(SUBMIT);
		dispatch(setSelected([]));
	}, [state, dispatch, dispatchStateAction]);

	const onImport = useCallback(async () => {
		if (readOnly || state.action !== "update") {
			console.warn("onImport: bad state");
			return state;
		}
		dispatchStateAction(IMPORT);
	}, [readOnly, state.action, dispatchStateAction]);

	return {
		state,
		hasChanges,
		onChangeBreakout,
		onChangeMeeting,
		submit,
		cancel,
		onImport,
		onAdd,
		onDelete,
	};
}
