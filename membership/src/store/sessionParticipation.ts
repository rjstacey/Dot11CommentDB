import {
	createSelector,
	createAction,
	Action,
	PayloadAction,
	Dictionary,
	EntityId,
} from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
	isObject,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { selectMemberEntities, type Member } from "./members";
import {
	selectSessionEntities,
	selectSession,
	upsertSessions,
	type Session,
} from "./sessions";

const renderPct = (pct: number) => (!isNaN(pct) ? `${pct.toFixed(2)}%` : "");

export const fields = {
	id: { label: "id", type: FieldType.NUMERIC },
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Affiliation: { label: "Affiliation" },
	Status: { label: "Status" },
	ExpectedStatus: { label: "Expected status" },
	Summary: { label: "Summary" },
	session_0: { type: FieldType.NUMERIC },
	session_1: { type: FieldType.NUMERIC },
	session_2: { type: FieldType.NUMERIC },
	session_3: { type: FieldType.NUMERIC },
	session_4: { type: FieldType.NUMERIC },
	session_5: { type: FieldType.NUMERIC },
	session_6: { type: FieldType.NUMERIC },
	session_7: { type: FieldType.NUMERIC },
};

export type SessionAttendanceSummary = {
	id: number;
	/** Session identifier */
	session_id: number;
	/** Percentage of meeting slots attended */
	AttendancePercentage: number;
	/** Declare attendance criteria met */
	DidAttend: boolean;
	/** Declare attendance criteria not met */
	DidNotAttend: boolean;
	/** SA PIN under which attendance was logged */
	SAPIN: number;
	/** Current SA PIN */
	CurrentSAPIN: number;
	Notes: string;
};

type RecentSessionAttendances = {
	SAPIN: number;
	sessionAttendanceSummaries: SessionAttendanceSummary[];
};

export type MemberAttendances = RecentSessionAttendances & {
	Name: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	Status: string;
	ExpectedStatus: string;
	Summary: string;
	LastSessionId: number;
	NonVoterDate: string | undefined;
};

/*
 * Slice
 */
//const sessionsAdapter = createEntityAdapter<Session>();
type ExtraState = {
	sessionIds: EntityId[];
	groupName: string | null;
};

const initialState: ExtraState = { sessionIds: [], groupName: null };

const selectId = (attendance: RecentSessionAttendances) => attendance.SAPIN;
const dataSet = "attendances";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {
		setDetails(state, action: PayloadAction<Partial<ExtraState>>) {
			return { ...state, ...action.payload };
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName } = action.payload;
					if (groupName !== state.groupName) {
						dataAdapter.removeAll(state);
						state.valid = false;
					}
					state.groupName = groupName;
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearAttendances.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
				}
			);
	},
});

export default slice;

/* Slice actions */
export const attendancesActions = slice.actions;

const { getSuccess, getFailure, setOne, setDetails, setSelected } = slice.actions;

// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearAttendances = createAction(dataSet + "/clear");
export { setSelected };

/*
 * Selectors
 */
export const selectAttendancesState = (state: RootState) => state[dataSet];

export const selectAttendancesEntities = (state: RootState) =>
	selectAttendancesState(state).entities;
const selectAttendancesIds = (state: RootState) =>
	selectAttendancesState(state).ids;
export const selectAttendancesGroupName = (state: RootState) =>
	selectAttendancesState(state).groupName;
export const selectAttendanceSessionIds = (state: RootState) =>
	selectAttendancesState(state).sessionIds;
export const selectAttendanceSessions = createSelector(
	selectAttendanceSessionIds,
	selectSessionEntities,
	(ids, entities) => ids.map((id) => entities[id]!).filter((s) => s)
);
export const selectMostRecentAttendedSession = (state: RootState) => {
	const sessions = selectAttendanceSessions(state);
	return sessions[sessions.length - 1];
};

function recentAttendanceStats(
	attendances: SessionAttendanceSummary[],
	sessionIds: EntityId[],
	sessionEntities: Dictionary<Session>,
	startDate?: string,
	sapin?: number
) {
	let plenaryCount = 0;
	sessionIds = sessionIds
		.filter((id) => sessionEntities[id]) // make sure session data is available
		.sort(
			(id1, id2) =>
				DateTime.fromISO(sessionEntities[id2]!.startDate).toMillis() -
				DateTime.fromISO(sessionEntities[id1]!.startDate).toMillis()
		) // Sort latest to oldest
		.filter((id) => {
			const s = sessionEntities[id]!;
			if (
				startDate &&
				DateTime.fromISO(s.startDate) < DateTime.fromISO(startDate)
			)
				// Only consider attendance after startDate
				return false;
			if (s.type === "p" && plenaryCount < 4) plenaryCount++;
			return plenaryCount <= 4; // Keep last 4 planaries and any intervening interims
		});

	// Total plenaries considered
	let total = plenaryCount;

	attendances = attendances
		.filter((a) => sessionIds.includes(a.session_id)) // only relevant sessions
		.sort(
			(a1, a2) =>
				DateTime.fromISO(
					sessionEntities[a2.session_id]!.startDate
				).toMillis() -
				DateTime.fromISO(
					sessionEntities[a1.session_id]!.startDate
				).toMillis()
		); // Sort latest to oldest

	// Check if last attendend was a plenary (partially or in full)
	let lastPpartial = false,
		lastPfull = false;
	if (attendances.length > 0) {
		// Last attended
		const a = attendances[0];
		const s = sessionEntities[a.session_id]!;
		if (s.type === 'p') {
			if (a.AttendancePercentage > 0 && a.AttendancePercentage < 75 && !a.DidNotAttend)
				lastPpartial = true;
			if ((a.AttendancePercentage > 75 && !a.DidNotAttend) || a.DidAttend)
				lastPfull = true;
		}
	}

	// Keep properly attended sessions
	attendances = attendances.filter(
		(a) => (a.AttendancePercentage >= 75 && !a.DidNotAttend) || a.DidAttend
	);

	// One interim may be substituted for a plenary; only keep latest properly attended interim
	let interimCount = 0;
	attendances = attendances.filter((a) => {
		const s = sessionEntities[a.session_id]!;
		if (s.type === "i") interimCount++;
		return s.type === "p" || interimCount === 1;
	});

	// Keep at most the last 4 properly attended sessions
	let attendendedSessionIds = attendances
		.slice(0, 4)
		.map((a) => a.session_id);

	return {
		total, // total considered
		count: attendendedSessionIds.length, // properly attended sessions
		lastPpartial, // last attended was a plenary
		lastPfull,
		lastSessionId: attendendedSessionIds[0] || 0,
	};
}

export const selectMemberAttendanceStats = createSelector(
	selectAttendancesEntities,
	selectAttendanceSessionIds,
	selectSessionEntities,
	selectMemberEntities,
	(state: RootState, SAPIN: number) => SAPIN,
	(attendancesEntities, sessionIds, sessionEntities, memberEntities, SAPIN) => {
		const attendances = attendancesEntities[SAPIN]?.sessionAttendanceSummaries || [];
		const member = memberEntities[SAPIN];
		const since = member?.StatusChangeHistory.find(
			(h) => h.NewStatus === "Non-Voter"
		)?.Date;
		return recentAttendanceStats(
			attendances,
			sessionIds,
			sessionEntities,
			since,
			SAPIN
		);
	}
)

function memberExpectedStatusFromAttendanceStats(
	member: Member,
	count: number,
	lastPpartial: boolean,
	lastPfull: boolean
) {
	const status = member.Status;

	if (
		member.StatusChangeOverride ||
		(status !== "Voter" &&
			status !== "Potential Voter" &&
			status !== "Aspirant" &&
			status !== "Non-Voter")
	)
		return "";

	/* A Voter, Potential Voter or Aspirant becomes a Non-Voter after failing to attend 1 of the last 4 plenary sessions.
	 * One interim may be substited for a plenary session. */
	if (count === 0 && status !== "Non-Voter") return "Non-Voter";

	/* A Non-Voter becomes an Aspirant after attending 1 plenary or interim session.
	 * A Voter or Potential Voter becomes an Aspirant if they have only attended 1 of the last 4 plenary sessions
	 * or intervening interim sessions. */
	if (count === 1 && status !== "Aspirant") return "Aspirant";

	/* An Aspirant becomes a Potential Voter after attending 2 of the last 4 plenary sessions. One intervening
	 * interim meeting may be substituted for a plenary meeting. */
	if (count === 2 && (status === "Non-Voter" || status === "Aspirant")) return "Potential Voter";

	/* A Potential Voter becomes a Voter at the next plenary session after attending 2 of the last 4 plenary
	 * sessions. One intervening interim meeting may be substituted for a plenary meeting. */
	if (((count >= 2 && lastPpartial) || (count === 3 && lastPfull) || count > 3) && (status === "Non-Voter" || status === "Aspirant" || status === "Potential Voter"))
		return "Voter";

	return "";
}

export const selectAttendancesWithMembershipAndSummary = createSelector(
	selectMemberEntities,
	selectAttendanceSessionIds,
	selectSessionEntities,
	selectAttendancesIds,
	selectAttendancesEntities,
	(memberEntities, sessionIds, sessionEntities, ids, entities) => {
		const newEntities: Record<EntityId, MemberAttendances> = {};
		ids.forEach((id) => {
			let entity = entities[id]!;
			let member = memberEntities[entity.SAPIN];
			let expectedStatus = "";
			let summary = "";
			let lastSessionId = 0;
			let nonVoterDate: string | undefined;
			if (member) {
				// Only care about attendance since becoming a 'Non-Voter'
				nonVoterDate = member.StatusChangeHistory.find(
					(h) => h.NewStatus === "Non-Voter"
				)?.Date;
				let stats = recentAttendanceStats(
					entity.sessionAttendanceSummaries,
					sessionIds,
					sessionEntities,
					nonVoterDate
				);
				let { total, count, lastPpartial, lastPfull } = stats;
				expectedStatus = memberExpectedStatusFromAttendanceStats(
					member,
					count,
					lastPpartial,
					lastPfull
				);
				summary = `${count}/${total}`;
				lastSessionId = stats.lastSessionId;
			}
			newEntities[id] = {
				...entity,
				Name: member ? member.Name : "",
				Email: member ? member.Email : "",
				Affiliation: member ? member.Affiliation : "",
				Employer: member ? member.Employer : "",
				Status: member ? member.Status : "New",
				ExpectedStatus: expectedStatus,
				Summary: summary,
				LastSessionId: lastSessionId,
				NonVoterDate: nonVoterDate,
			};
		});
		return newEntities;
	}
);

export const selectMemberRecentAttendances = createSelector(
	selectAttendanceSessionIds,
	selectAttendancesEntities,
	(state: RootState, SAPIN: number) => SAPIN,
	(sessionIds, attendancesEntities, SAPIN) => {
		const session_ids = sessionIds.slice().reverse() as number[];
		const attendances: Record<number, SessionAttendanceSummary>[] = [];
		for (const session_id of session_ids) {
			const sessionAttendances =
				attendancesEntities[SAPIN]?.sessionAttendanceSummaries || [];
			let a = sessionAttendances.find((a) => a.session_id === session_id);
			if (!a) {
				// No entry for this session; generate a "null" entry
				a = {
					id: 0,
					session_id,
					AttendancePercentage: 0,
					DidAttend: false,
					DidNotAttend: false,
					Notes: "",
					SAPIN,
					CurrentSAPIN: SAPIN
				};
			}
			attendances.push(a);
		}
		return attendances;
	}
);

function getField(entity: MemberAttendances, dataKey: string) {
	const m = /session_(\d+)/.exec(dataKey);
	if (m) {
		const i = Number(m[1]);
		const summary = entity.sessionAttendanceSummaries[i];
		return summary ? renderPct(summary.AttendancePercentage) : "";
	}
	return entity[dataKey as keyof MemberAttendances];
}

export const attendancesSelectors = getAppTableDataSelectors(
	selectAttendancesState,
	{ selectEntities: selectAttendancesWithMembershipAndSummary, getField }
);

/*
 * Thunk actions
 */
function validResponse(
	response: any
): response is {
	attendances: RecentSessionAttendances[];
	sessions: Session[];
} {
	return (
		isObject(response) &&
		Array.isArray(response.attendances) &&
		Array.isArray(response.sessions)
	);
}

let loadingPromise: Promise<RecentSessionAttendances[]>;
export const loadAttendances =
	(groupName: string): AppThunk<RecentSessionAttendances[]> =>
	async (dispatch, getState) => {
		const { loading, groupName: currentGroupName } = selectAttendancesState(
			getState()
		);
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/attendances`;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(upsertSessions(response.sessions));
				dispatch(getSuccess(response.attendances));
				dispatch(setDetails({sessionIds: response.sessions.map(s => s.id)}));
				return response.attendances;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError(`Unable to get attendees`, error));
				return [];
			});
		return loadingPromise;
	};

export type SessionAttendanceUpdate = {
	session_id: number;
	changes: Partial<SessionAttendanceSummary>;
};

export const updateAttendances =
	(sapin: number, updates: SessionAttendanceUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const groupName = selectAttendancesGroupName(state);
		const url = `/api/${groupName}/attendances`;
		const entities = selectAttendancesEntities(state);
		let entity = entities[sapin];
		if (!entity) {
			console.error(`Entry for ${sapin} does not exist`);
			return;
		}
		const attendanceUpdates = [],
			attendanceAdds: SessionAttendanceSummary[] = [],
			attendanceDeletes: number[] = [];
		for (const update of updates) {
			const { session_id, changes } = update;
			let a = entity.sessionAttendanceSummaries.find(
				(a) => a.session_id === session_id
			);
			if (!a) {
				// Entry does not exist; generate null entry
				a = {
					id: 0,
					session_id,
					AttendancePercentage: 0,
					DidAttend: false,
					DidNotAttend: false,
					Notes: "",
					SAPIN: entity.SAPIN,
					CurrentSAPIN: entity.SAPIN
				};
			}
			a = { ...a, ...changes };
			if (
				a.id &&
				!a.AttendancePercentage &&
				!a.DidAttend &&
				!a.DidNotAttend &&
				!a.Notes
			) {
				// If change results in a null entry, then delete the entry
				attendanceDeletes.push(a.id);
			} else if (!a.id) {
				// If the id is zero, it needs to be added
				attendanceAdds.push(a);
			} else {
				attendanceUpdates.push({ id: a.id, changes });
			}
		}
		let response;
		let updatedSessionAttendances = entity.sessionAttendanceSummaries;
		if (attendanceDeletes.length > 0) {
			try {
				await fetcher.delete(url, attendanceDeletes);
				updatedSessionAttendances = updatedSessionAttendances.filter(
					(a) => !attendanceDeletes.includes(a.id)
				);
			} catch (error) {
				dispatch(setError("Unable to delete attendances", error));
			}
		}
		if (attendanceAdds.length > 0) {
			try {
				response = await fetcher.post(url, attendanceAdds);
				if (!Array.isArray(response))
					throw new TypeError("Uxpected response to POST " + url);
				updatedSessionAttendances = updatedSessionAttendances.concat(
					response as SessionAttendanceSummary[]
				);
			} catch (error) {
				dispatch(setError("Unable to add attendances", error));
			}
		}
		if (attendanceUpdates.length > 0) {
			try {
				response = await fetcher.patch(url, attendanceUpdates);
				if (!Array.isArray(response))
					throw new TypeError("Uxpected response to PATCH " + url);
				const attendances = response as SessionAttendanceSummary[];
				updatedSessionAttendances = updatedSessionAttendances.map(
					(aOrig) =>
						attendances.find((aUpdt) => aUpdt.id === aOrig.id) || aOrig
				);
			} catch (error) {
				dispatch(setError("Unable to update attendances", error));
			}
		}
		dispatch(
			setOne({
				...entity,
				sessionAttendanceSummaries: updatedSessionAttendances,
			})
		);
	};

export const importAttendances =
	(session_id: number, useDailyAttendance?: boolean): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectAttendancesGroupName(getState());
		if (!groupName) {
			dispatch(setError("Unable to import attendances", "group not set"));
			return;
		}
		let url = `/api/${groupName}/attendances/${session_id}/import`;
		if (useDailyAttendance) url += "?use=daily-attendance";
		dispatch(getPending({ groupName }));
		let response: any;
		try {
			response = await fetcher.post(url);
			if (!validResponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(getFailure());
			const session = selectSession(getState(), session_id);
			dispatch(
				setError(
					"Unable to import attendance summary for session " +
						session?.number || `id=${session_id}`,
					error
				)
			);
			return;
		}
		dispatch(upsertSessions(response.sessions));
		dispatch(
			setDetails({ sessionIds: response.sessions.map((s) => s.id) })
		);
		dispatch(getSuccess(response.attendances));
	};
