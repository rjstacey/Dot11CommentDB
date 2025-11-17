import { createSelector, Dictionary, EntityId } from "@reduxjs/toolkit";

import { DateTime } from "luxon";

import {
	createAppTableDataSlice,
	Fields,
	FieldType,
	getAppTableDataSelectors,
} from "@common";

import type { RootState } from ".";
import { AppThunk } from ".";
import {
	selectMemberEntities,
	StatusType,
	ExpectedStatusType,
	Member,
} from "./members";
import {
	selectRecentSessions,
	selectSessionEntities,
	type Session,
} from "./sessions";
import {
	loadAttendanceSummary,
	selectMemberAttendances,
	type SessionAttendanceSummary,
} from "./attendanceSummaries";

export const fields: Fields = {
	id: { label: "id", type: FieldType.NUMERIC },
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Affiliation: { label: "Affiliation" },
	Status: { label: "Status" },
	ExpectedStatus: { label: "Expected status" },
	Summary: { label: "Summary" },
	session_0: { label: "S0", type: FieldType.NUMERIC },
	session_1: { label: "S1", type: FieldType.NUMERIC },
	session_2: { label: "S2", type: FieldType.NUMERIC },
	session_3: { label: "S3", type: FieldType.NUMERIC },
	session_4: { label: "S4", type: FieldType.NUMERIC },
	session_5: { label: "S5", type: FieldType.NUMERIC },
	session_6: { label: "S6", type: FieldType.NUMERIC },
	session_7: { label: "S7", type: FieldType.NUMERIC },
};

function renderPct(pct: number | null | undefined) {
	return typeof pct === "number" && !isNaN(pct) ? `${pct.toFixed(2)}%` : "";
}

function getField(entity: MemberAttendances, dataKey: string) {
	const m = /session_(\d+)/.exec(dataKey);
	if (m) {
		const i = Number(m[1]);
		const summary = entity.sessionAttendanceSummaries[i];
		return renderPct(summary?.AttendancePercentage);
	}
	return entity[dataKey as keyof MemberAttendances];
}

export type RecentSessionAttendances = {
	SAPIN: number;
	sessionAttendanceSummaries: SessionAttendanceSummary[];
};

export type MemberAttendances = RecentSessionAttendances & {
	Name: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	Status: StatusType | "New";
	ExpectedStatus: ExpectedStatusType;
	Summary: string;
	LastSessionId: number;
	NonVoterDate: string | undefined;
};

/*
 * Slice
 */
const dataSet = "sessionParticipation";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId: (entity: MemberAttendances) => entity.SAPIN,
	initialState: { sessionIds: [] as number[] },
	reducers: {
		setSessionIds(state, action: { payload: number[] }) {
			state.sessionIds = action.payload;
		},
	},
});

export default slice;

/*
 * Slice actions
 */
const { setSessionIds } = slice.actions;
export const sessionParticipationActions = slice.actions;
export const setSessionParticipationSelected = slice.actions.setSelected;

/*
 * Selectors
 */
export const selectSessionParticipationState = (state: RootState) =>
	state[dataSet];
export const selectSessionParticipationSessionIds = (state: RootState) =>
	selectSessionParticipationState(state).sessionIds;
export const selectSessionParticipationSelected = (state: RootState) =>
	selectSessionParticipationState(state).selected;

export const selectSessionParticipationIds = createSelector(
	selectMemberAttendances,
	(attendanceSummaryEntities) =>
		Object.keys(attendanceSummaryEntities).map(Number)
);

const selectSessionParticipationEntities = createSelector(
	selectSessionParticipationIds,
	selectMemberAttendances,
	(ids, memberAttendances) => {
		const entities: Record<number, RecentSessionAttendances> = {};
		for (const SAPIN of ids) {
			const sessionAttendanceSummaryEntities = memberAttendances[SAPIN];
			entities[SAPIN] = {
				SAPIN,
				sessionAttendanceSummaries: Object.values(
					sessionAttendanceSummaryEntities
				),
			};
		}
		return entities;
	}
);

function recentAttendanceStats(
	attendances: SessionAttendanceSummary[],
	sessionIds: EntityId[],
	sessionEntities: Dictionary<Session>,
	startDate?: string
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
				DateTime.fromISO(s.endDate) < DateTime.fromISO(startDate)
			)
				// Only consider attendance after startDate
				return false;
			if (s.type === "p" && plenaryCount < 4) plenaryCount++;
			return plenaryCount <= 4; // Keep last 4 planaries and any intervening interims
		});

	// Total plenaries considered
	const total = plenaryCount;

	// Has attended at least one session partially
	const hasPartial =
		attendances.findIndex((a) => (a.AttendancePercentage || 0) > 0) >= 0;

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
		const attendancePct = a.AttendancePercentage || 0;
		const s = sessionEntities[a.session_id]!;
		if (s.type === "p") {
			if (attendancePct > 0 && attendancePct < 75 && !a.DidNotAttend)
				lastPpartial = true;
			if ((attendancePct >= 75 || a.DidAttend) && !a.DidNotAttend)
				lastPfull = true;
		}
	}

	// Keep properly attended sessions
	attendances = attendances.filter(
		(a) =>
			((a.AttendancePercentage || 0) >= 75 || a.DidAttend) &&
			!a.DidNotAttend
	);

	// One interim may be substituted for a plenary; only keep latest properly attended interim
	let interimCount = 0;
	attendances = attendances.filter((a) => {
		const s = sessionEntities[a.session_id]!;
		if (s.type === "i") interimCount++;
		return s.type === "p" || interimCount === 1;
	});

	// Keep at most the last 4 properly attended sessions
	const attendendedSessionIds = attendances
		.slice(0, 4)
		.map((a) => a.session_id);

	return {
		total, // total considered
		count: attendendedSessionIds.length, // properly attended sessions
		lastPpartial, // last attended was a plenary
		lastPfull,
		lastSessionId: attendendedSessionIds[0] || 0,
		hasPartial,
	};
}

export const selectMemberAttendanceStats = createSelector(
	selectMemberAttendances,
	selectSessionParticipationSessionIds,
	selectSessionEntities,
	selectMemberEntities,
	(state: RootState, SAPIN: number) => SAPIN,
	(
		memberAttendanceEntities,
		sessionIds,
		sessionEntities,
		memberEntities,
		SAPIN
	) => {
		const attendanceEntities = memberAttendanceEntities[SAPIN];
		const attendances = attendanceEntities
			? Object.values(attendanceEntities)
			: [];
		const member = memberEntities[SAPIN];
		const since =
			member?.StatusChangeHistory.find((h) => h.NewStatus === "Non-Voter")
				?.Date || undefined;
		return recentAttendanceStats(
			attendances,
			sessionIds,
			sessionEntities,
			since
		);
	}
);

function memberExpectedStatusFromAttendanceStats(
	member: Member,
	count: number,
	lastPpartial: boolean,
	lastPfull: boolean,
	hasPartial: boolean
): ExpectedStatusType {
	const status = member.Status;

	if (
		member.StatusChangeOverride ||
		(status !== "Voter" &&
			status !== "Potential Voter" &&
			status !== "Aspirant" &&
			status !== "Observer" &&
			status !== "Non-Voter")
	)
		return "";

	/* A Voter, Potential Voter or Aspirant becomes a Non-Voter after failing to attend 1 of the last 4 plenary sessions.
	 * One interim may be substited for a plenary session. */
	if (count === 0 && !hasPartial && status !== "Non-Voter")
		return "Non-Voter";

	/* However, if any attendance means Observer rather than Non-Voter */
	if (count === 0 && hasPartial && status !== "Observer") return "Observer";

	/* A Non-Voter becomes an Aspirant after attending 1 plenary or interim session.
	 * A Voter or Potential Voter becomes an Aspirant if they have only attended 1 of the last 4 plenary sessions
	 * or intervening interim sessions. */
	if (count === 1 && status !== "Aspirant") return "Aspirant";

	/* An Aspirant becomes a Potential Voter after attending 2 of the last 4 plenary sessions. One intervening
	 * interim meeting may be substituted for a plenary meeting. */
	if (count === 2 && (status === "Non-Voter" || status === "Aspirant"))
		return "Potential Voter";

	/* A Potential Voter becomes a Voter at the next plenary session after attending 2 of the last 4 plenary
	 * sessions. One intervening interim meeting may be substituted for a plenary meeting. */
	if (
		((count >= 2 && lastPpartial) ||
			(count === 3 && lastPfull) ||
			count > 3) &&
		(status === "Non-Voter" ||
			status === "Aspirant" ||
			status === "Potential Voter")
	)
		return "Voter";

	return "";
}

export const selectSessionParticipationWithMembershipAndSummary =
	createSelector(
		selectSessionParticipationIds,
		selectSessionParticipationEntities,
		selectMemberEntities,
		selectSessionParticipationSessionIds,
		selectSessionEntities,
		(ids, entities, memberEntities, sessionIds, sessionEntities) => {
			const newEntities: Record<EntityId, MemberAttendances> = {};
			ids.forEach((id) => {
				const entity = entities[id]!;
				const member = memberEntities[entity.SAPIN];
				let expectedStatus: ExpectedStatusType = "";
				let summary = "";
				let lastSessionId = 0;
				let nonVoterDate: string | undefined;
				if (member) {
					// Only care about attendance since becoming a 'Non-Voter'
					nonVoterDate =
						member.StatusChangeHistory.find(
							(h) => h.NewStatus === "Non-Voter"
						)?.Date || undefined;
					const stats = recentAttendanceStats(
						entity.sessionAttendanceSummaries,
						sessionIds,
						sessionEntities,
						nonVoterDate
					);
					const {
						total,
						count,
						lastPpartial,
						lastPfull,
						hasPartial,
					} = stats;
					expectedStatus = memberExpectedStatusFromAttendanceStats(
						member,
						count,
						lastPpartial,
						lastPfull,
						hasPartial
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

export const sessionParticipationSelectors = getAppTableDataSelectors(
	selectSessionParticipationState,
	{
		selectEntities: selectSessionParticipationWithMembershipAndSummary,
		selectIds: selectSessionParticipationIds,
		getField,
	}
);

export const loadRecentAttendanceSummaries =
	(groupName: string, force = false): AppThunk<void> =>
	async (dispatch, getState) => {
		const state = getState();
		const sessions = selectRecentSessions(state);
		const sessionIds = sessions.map((s) => s.id);
		dispatch(setSessionIds(sessionIds));
		await Promise.all(
			sessionIds.map((session_id) =>
				dispatch(loadAttendanceSummary(groupName, session_id, force))
			)
		);
	};
