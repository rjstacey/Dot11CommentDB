import React from "react";
import { DateTime } from "luxon";
import isEqual from "lodash.isequal";
import type { Dictionary } from "@reduxjs/toolkit";
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
	selectBreakoutMeeting,
	setSelectedBreakouts as setSelected,
	addBreakouts,
	updateBreakouts,
	deleteBreakouts,
	type SyncedBreakout,
	type Breakout,
} from "@/store/imatBreakouts";
import type { ImatMeeting } from "@/store/imatMeetings";
import { addMeetings, updateMeetings } from "@/store/meetings";
import { selectCurrentSession, type Session } from "@/store/sessions";
import {
	convertEntryToMeeting,
	type MeetingEntry,
	type MeetingEntryPartial,
	type MeetingEntryMultiple,
} from "./convertMeetingEntry";

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
		timezone: imatMeeting.timezone,
		calendarAccountId: null,
		calendarEventId: null,
		webexAccountId: null,
		webexMeetingId: null,
		//webexMeeting: {accountId: null},
		imatMeetingId: imatMeeting.id,
		imatBreakoutId: breakout.id,
		imatGracePeriod: 0,
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

function useImatBreakoutsEditState() {
	const dispatch = useAppDispatch();
	const { loading, valid, selected } = useAppSelector(selectBreakoutsState);
	const entities = useAppSelector(selectSyncedBreakoutEntities);
	const imatMeetingId = useAppSelector(selectBreakoutMeetingId);

	const initState = React.useCallback(() => {
		const breakouts = selected.map((id) => entities[id]).filter(Boolean);

		if (loading && !valid) {
			return {
				action: null,
				message: "Loading...",
				imatMeetingId,
				breakouts,
			} satisfies ImatBreakoutsEditState;
		} else if (breakouts.length === 0) {
			return {
				action: null,
				message: "Nothing selected",
				imatMeetingId,
				breakouts,
			} satisfies ImatBreakoutsEditState;
		} else {
			const entry = breakouts.reduce(
				(entry, breakout) => deepMergeTagMultiple(entry, breakout),
				{}
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

	const resetState = React.useCallback(
		() => setState(initState),
		[initState]
	);

	React.useEffect(() => {
		if (state.action === "add" || state.action === "import") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				resetState();
				return;
			}
			const ids = state.breakouts.map((m) => m.id);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelected(ids));
				});
			}
		} else {
			resetState();
		}
	}, [selected, resetState]);

	const [state, setState] = React.useState<ImatBreakoutsEditState>(initState);

	return [state, setState, resetState] as const;
}

export function useImatBreakoutsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const session = useAppSelector(selectCurrentSession)!;
	const groupId = useAppSelector(selectTopLevelGroupId)!;
	const groupEntities = useAppSelector(selectGroupEntities);
	const imatMeeting = useAppSelector(selectBreakoutMeeting);

	const [state, setState, resetState] = useImatBreakoutsEditState();

	const hasChanges = React.useCallback(
		() =>
			state.action === "add" ||
			state.action === "import" ||
			(state.action === "update" && state.edited !== state.saved),
		[state]
	);

	const onChangeMeeting = React.useCallback(
		(changes: MeetingEntryPartial) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChange: state is readOnly");
					return state;
				}
				if (state.action !== "import") {
					console.warn("onChange: in unexpected state");
					return state;
				}
				const edited: MeetingEntryMultiple = deepMerge(
					state.edited,
					changes
				);
				return { ...state, edited } satisfies ImatBreakoutsEditState;
			});
		},
		[readOnly, setState]
	);

	const onChangeBreakout = React.useCallback(
		(changes: BreakoutEntryPartial) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChangeBreakout: state is readOnly");
					return state;
				}
				if (state.action === "add") {
					const edited: SyncedBreakout = deepMerge(
						state.edited,
						changes
					);
					return {
						...state,
						edited,
					} satisfies ImatBreakoutsEditState;
				} else if (state.action === "update") {
					let edited: BreakoutEntryMultiple = deepMerge(
						state.edited,
						changes
					);
					// If the changes revert to the original, then store entry as original for easy hasUpdates comparison
					changes = deepDiff(state.saved, edited) || {};
					if (Object.keys(changes).length === 0) edited = state.saved;
					return {
						...state,
						edited,
					} satisfies ImatBreakoutsEditState;
				}
				console.warn("onChangeBreakout: in unexpected state");
				return state;
			});
		},
		[readOnly, setState]
	);

	const submit = React.useCallback(async () => {
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
					session
				)
			);
			await dispatch(addMeetings(meetings));
			resetState();
		} else if (state.action === "add") {
			const entry = state.edited;
			const imatMeetingId = state.imatMeetingId;
			const [id] = await dispatch(
				addBreakouts(imatMeetingId!, [state.edited])
			);
			if (entry.meetingId) {
				await dispatch(
					updateMeetings([
						{
							id: entry.meetingId,
							changes: { imatMeetingId, imatBreakoutId: id },
						},
					])
				);
			}
			dispatch(setSelected([id]));
		} else if (state.action === "update") {
			/* Only called when action === "update" */
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
					updateBreakouts(imatMeetingId!, breakoutUpdates)
				);
			}
			if (meetingUpdates.length > 0) {
				await dispatch(updateMeetings(meetingUpdates));
			}
		}
	}, [state, session, resetState]);

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
		const edited: SyncedBreakout = {
			...getDefaultBreakout(),
			imatMeetingId: state.imatMeetingId,
			meetingId: null,
		};
		setState((state) => ({
			...state,
			action: "add",
			edited,
			saved: undefined,
		}));
		dispatch(setSelected([]));
	}, [readOnly, state, setState]);

	const onDelete = React.useCallback(async () => {
		if (readOnly) {
			console.warn("onDelete: state is readOnly");
			return;
		}
		if (state.action !== "update") {
			console.warn("onDelete: in unexpected state");
			return;
		}

		const ids = state.breakouts.map((m) => m.id);
		const ok = await ConfirmModal.show(
			"Are you sure you want to delete the selected " +
				(ids.length > 1 ? ids.length + "entries?" : "entry?")
		);
		if (!ok) return;
		await dispatch(deleteBreakouts(state.imatMeetingId!, ids));
	}, [state, dispatch]);

	const onImport = React.useCallback(async () => {
		setState((state) => {
			if (readOnly) {
				console.warn("onImport: state is readOnly");
				return state;
			}
			if (state.action !== "update") {
				console.warn("onImport: unexpected state");
				return state;
			}
			const breakout = state.breakouts[0];
			const edited = convertBreakoutToMeetingEntry(
				breakout,
				imatMeeting!,
				session,
				groupId,
				groupEntities
			);
			return {
				...state,
				action: "import",
				edited,
				saved: undefined,
				session,
			} satisfies ImatBreakoutsEditState;
		});
	}, [imatMeeting, session, groupId, groupEntities, setState]);

	return {
		state,
		hasChanges,
		onChangeBreakout,
		onChangeMeeting,
		submit,
		cancel: resetState,
		onImport,
		onAdd,
		onDelete,
	};
}
