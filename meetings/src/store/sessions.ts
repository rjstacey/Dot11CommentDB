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
	setError,
	displayDate,
	getAppTableDataSelectors,
	isObject,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { selectCurrentSessionId } from "./current";
import { selectGroupEntities, selectWorkingGroupByName } from "./groups";
import { AccessLevel } from "./user";

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

export type SessionAdd = Omit<Session, "id" | "attendees">;

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

export const displaySessionType = (type: SessionType | null) =>	type? SessionTypeLabels[type]: '';

export type Credit = "Normal" | "Extra" | "Zero" | "Other";

export function getCredit(creditStr: string): {credit: Credit, creditOverrideNumerator: number, creditOverrideDenominator: number} {
	let credit: Credit = "Zero",
		creditOverrideNumerator = 0,
		creditOverrideDenominator = 0;
	const m = /(Other) (\d+)\/(\d+)/.exec(creditStr);
	if (m) {
		credit = "Other";
		creditOverrideNumerator = Number(m[2]);
		creditOverrideDenominator = Number(m[3]);
	}
	else if (/Normal|Extra|Zero/.test(creditStr)) {
		credit = creditStr as Credit;
	}
	return {
		credit,
		creditOverrideNumerator,
		creditOverrideDenominator
	}
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
};
const initialState: ExtraState = { groupName: null };
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
				const {groupName} = action.payload;
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
		)
	}
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

/* Selectors */
export const selectSessionsState = (state: RootState) => state[dataSet];
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
	const {groupName} = selectSessionsState(state);
	const group = groupName? selectWorkingGroupByName(state, groupName): undefined;
	return group?.permissions.meetings || AccessLevel.none;
}

// Override the default getPending()
const getPending = createAction<{groupName: string}>(dataSet + "/getPending");
export const clearSessions = createAction(dataSet + "/clear");

/* Thunk actions */
function validSession(session: any): session is Session {
	return (
		isObject(session) &&
		typeof session.id === "number" &&
		(session.number === null || typeof session.number === "number") &&
		typeof session.name === "string" &&
		["p", "i", "o", "g"].includes(session.type) &&
		(session.groupId === null || typeof session.groupId === "string") &&
		(session.imatMeetingId === null ||
			typeof session.imatMeetingId === "number") &&
		/\d{4}-\d{2}-\d{2}/.test(session.startDate) &&
		/\d{4}-\d{2}-\d{2}/.test(session.endDate) &&
		typeof session.timezone === "string"
	);
}

function validSessions(sessions: any): sessions is Session[] {
	return Array.isArray(sessions) && sessions.every(validSession);
}

let loadingPromise: Promise<Session[]>;
export const loadSessions =
	(groupName: string): AppThunk<Session[]> =>
	(dispatch, getState) => {
		const {loading, groupName: currnetGroupName} = selectSessionsState(getState());
		if (loading && currnetGroupName === groupName) {
			return loadingPromise;
		}
		dispatch(getPending({groupName}));
		const url = `/api/${groupName}/sessions`;
		loadingPromise = fetcher.get(url)
			.then((response: any) => {
				if (!validSessions(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(getSuccess(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get sessions", error));
				return [];
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
		let response: any;
		try {
			response = await fetcher.patch(url, update);
			if (!validSession(response))
				throw new TypeError("Unexpected response to PATCH " + url);
		} catch (error) {
			dispatch(setError(`Unable to update session`, error));
			return;
		}
		dispatch(setOne(response));
	};

export const addSession =
	(session: SessionAdd): AppThunk<EntityId | undefined> =>
	async (dispatch, getState) => {
		const groupName = selectSessionsGroupName(getState());
		const url = `/api/${groupName}/sessions`;
		let response: any;
		try {
			response = await fetcher.post(url, session);
			if (!validSession(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(setError("Unable to add session", error));
			return;
		}
		dispatch(addOne(response));
		return response.id;
	};

export const deleteSessions =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectSessionsGroupName(getState());
		const url = `/api/${groupName}/sessions`;
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError(`Unable to delete meetings ${ids}`, error));
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
