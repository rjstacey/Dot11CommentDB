import {
	createSelector,
	EntityId,
	Dictionary,
	createAction,
} from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import {
	createAppTableDataSlice,
	FieldType,
	fetcher,
	displayDate,
	getAppTableDataSelectors,
	AccessLevel,
} from "@common";

import type { RootState, AppThunk } from ".";
import { setError } from ".";
import { selectCurrentSessionId } from "./current";
import { selectGroupEntities, selectTopLevelGroupByName } from "./groups";

import {
	Session,
	Room,
	Timeslot,
	SessionCreate,
	sessionSchema,
	sessionsSchema,
} from "@schemas/sessions";

export type { Session, Room, Timeslot, SessionCreate };
/*
export type Room = {
	id: number;
	name: string;
	description: string;
};

export type Timeslot = {
	id: number;
	name: string;
	startTime: string;
	endTime: string;
};

export interface Session {
	id: number;
	number: number | null;
	name: string;
	type: SessionType | null;
	groupId: string | null;
	isCancelled: boolean;
	imatMeetingId: number | null;
	OrganizerID: string;
	timezone: string;
	startDate: string;
	endDate: string;
	rooms: Room[];
	timeslots: Timeslot[];
	defaultCredits: string[][];
	attendees: number;
}
*/

export const SessionTypeLabels = {
	p: "Plenary",
	i: "Interim",
	o: "Other",
	g: "General",
} as const;

export type SessionType = keyof typeof SessionTypeLabels;

export const SessionTypeOptions = Object.entries(SessionTypeLabels).map(
	([value, label]) =>
		({ value, label } as { value: SessionType; label: string })
);

export const displaySessionType = (type: SessionType | null) =>
	type ? SessionTypeLabels[type] : "";

export type Credit = "Normal" | "Extra" | "Zero" | "Other";

export function getCredit(creditStr: string): {
	credit: Credit;
	creditOverrideNumerator: number;
	creditOverrideDenominator: number;
} {
	let credit: Credit = "Zero",
		creditOverrideNumerator = 0,
		creditOverrideDenominator = 0;
	const m = /(Other) (\d+)\/(\d+)/.exec(creditStr);
	if (m) {
		credit = "Other";
		creditOverrideNumerator = Number(m[2]);
		creditOverrideDenominator = Number(m[3]);
	} else if (/Normal|Extra|Zero/.test(creditStr)) {
		credit = creditStr as Credit;
	}
	return {
		credit,
		creditOverrideNumerator,
		creditOverrideDenominator,
	};
}

export const fields = {
	id: { label: "ID", isId: true, type: FieldType.NUMERIC },
	number: { label: "Session number", type: FieldType.NUMERIC },
	name: { label: "Session name" },
	type: {
		label: "Session type",
		dataRenderer: displaySessionType,
		options: SessionTypeOptions,
	},
	groupId: { label: "Organizing group ID" },
	groupName: { label: "Organizing group" },
	imatMeetingId: {
		label: "IMAT meeting" /*, dataRenderer: displayImatMeetingId*/,
	},
	startDate: {
		label: "Start",
		dataRenderer: displayDate,
		type: FieldType.DATE,
	},
	endDate: { label: "End", dataRenderer: displayDate, type: FieldType.DATE },
	timezone: { label: "Timezone" },
	attendees: { label: "Attendees" },
};

/*
 * Slice
 */
type ExtraState = {
	groupName: string | null;
	lastLoad: string | null;
};
const initialState: ExtraState = { groupName: null, lastLoad: null };
const sortComparer = (a: Session, b: Session) =>
	DateTime.fromISO(b.startDate).toMillis() -
	DateTime.fromISO(a.startDate).toMillis();
const dataSet = "sessions";
const slice = createAppTableDataSlice({
	name: dataSet,
	sortComparer,
	fields,
	initialState,
	reducers: {},
	extraReducers(builder, dataAdapter) {
		builder
			.addMatcher(
				(action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName } = action.payload;
					state.lastLoad = new Date().toISOString();
					if (state.groupName !== groupName) {
						state.groupName = groupName;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action) => action.type === clearSessions.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
				}
			);
	},
});

export default slice;

/* Slice actions */
export const sessionsActions = slice.actions;

const {
	getSuccess,
	getFailure,
	updateOne,
	addOne,
	setOne,
	removeMany,
	setSelected,
	setUiProperties,
	setPanelIsSplit,
} = slice.actions;

export { setSelected, setUiProperties, setPanelIsSplit };

// Override the default getPending()
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearSessions = createAction(dataSet + "/clear");

/* Selectors */
export const selectSessionsState = (state: RootState) => state[dataSet];
const selectSessionsAge = (state: RootState) => {
	const lastLoad = selectSessionsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectSessionIds = (state: RootState) =>
	selectSessionsState(state).ids;
export const selectSessionEntities = (state: RootState) =>
	selectSessionsState(state).entities;
const selectSessionsGroupName = (state: RootState) =>
	selectSessionsState(state).groupName;
export const selectSessionsSelected = (state: RootState) =>
	selectSessionsState(state).selected;

export const selectCurrentSession = (state: RootState) => {
	const id = selectCurrentSessionId(state);
	const entities = selectSessionEntities(state);
	return entities[id!];
};

export const selectSessions = createSelector(
	selectSessionIds,
	selectSessionEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectSessionByNumber = (state: RootState, number: number) => {
	const sessions = selectSessions(state);
	return sessions.find((session) => session.number === number);
};

export const selectCurrentSessionDates = createSelector(
	selectCurrentSession,
	(session) => {
		let dates: string[] = [];
		if (session) {
			const start = DateTime.fromISO(session.startDate);
			const end = DateTime.fromISO(session.endDate).plus({ days: 1 });
			const nDays = end.diff(start, "days").days;
			if (nDays > 0) {
				dates = new Array(nDays)
					.fill(null)
					.map((d, i) => start.plus({ days: i }).toISODate()!);
			}
		}
		return dates;
	}
);

type SyncedSession = Session & {
	groupName: string;
};

export const selectSyncedSessionEntities = createSelector(
	selectSessionEntities,
	selectGroupEntities,
	(sessions, groupEntities) => {
		const entities: Dictionary<SyncedSession> = {};
		for (const [id, session] of Object.entries(sessions)) {
			const group = session!.groupId
				? groupEntities[session!.groupId]
				: undefined;
			entities[id] = {
				...session!,
				groupName: group ? group.name : "Unknown",
			};
		}
		return entities;
	}
);

export const sessionsSelectors = getAppTableDataSelectors(selectSessionsState, {
	selectEntities: selectSyncedSessionEntities,
});

export const selectUserSessionsAccess = (state: RootState) => {
	const { groupName } = selectSessionsState(state);
	const group = groupName
		? selectTopLevelGroupByName(state, groupName)
		: undefined;
	return group?.permissions.meetings || AccessLevel.none;
};

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<Session[]>;
export const loadSessions =
	(groupName: string, force = false): AppThunk<Session[]> =>
	(dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectSessionsState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectSessionsAge(state);
			if (!force && age && age < AGE_STALE)
				return Promise.resolve(selectSessions(state));
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/sessions`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response) => {
				const sessions = sessionsSchema.parse(response);
				dispatch(getSuccess(sessions));
				return sessions;
			})
			.catch((error) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
				return [];
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const updateSession =
	(id: EntityId, changes: Partial<Session>): AppThunk =>
	async (dispatch, getState) => {
		const update = { id, changes };
		dispatch(updateOne(update));
		const groupName = selectSessionsGroupName(getState());
		const url = `/api/${groupName}/sessions`;
		let session: Session;
		try {
			const response = await fetcher.patch(url, update);
			session = sessionSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		dispatch(setOne(session));
	};

export const addSession =
	(sessionIn: SessionCreate): AppThunk<EntityId | undefined> =>
	async (dispatch, getState) => {
		const groupName = selectSessionsGroupName(getState());
		const url = `/api/${groupName}/sessions`;
		let session: Session;
		try {
			const response = await fetcher.post(url, sessionIn);
			session = sessionSchema.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(addOne(session));
		return session.id;
	};

export const deleteSessions =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectSessionsGroupName(getState());
		const url = `/api/${groupName}/sessions`;
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
		}
		dispatch(removeMany(ids));
	};

/*
 * Functions to convert date/slot/room to/from id
 */
export const toSlotId = (date: string, slot: Timeslot, room: Room) =>
	`${date}/${slot.id}/${room.id}`;
export const fromSlotId = (id: string) => {
	const p = id.split("/");
	return [p[0], parseInt(p[1]), parseInt(p[2])] as const;
};
