import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import {
	selectSessionParticipationIds,
	selectSessionParticipationWithMembershipAndSummary,
} from "@/store/sessionParticipation";

export type AttendanceCumulative = {
	sessionsAttended: number;
	sessionsAttendedInPerson: number;
	count: number;
	sum: number;
	countPct: number;
	sumPct: number;
};

export function useAttendanceCumulative({
	selected,
	statuses,
}: {
	selected: number[];
	statuses: string[];
}) {
	const sapins = useAppSelector(selectSessionParticipationIds);
	const entities = useAppSelector(
		selectSessionParticipationWithMembershipAndSummary
	);

	return React.useMemo(() => {
		const nSessions = selected.length;
		const data: AttendanceCumulative[][] = [];
		for (
			let sessionsAttended = 1;
			sessionsAttended <= nSessions;
			sessionsAttended++
		) {
			data[sessionsAttended - 1] = new Array(sessionsAttended);
			for (
				let sessionsAttendedInPerson = 0;
				sessionsAttendedInPerson <= sessionsAttended;
				sessionsAttendedInPerson++
			) {
				data[sessionsAttended - 1][sessionsAttendedInPerson] = {
					sessionsAttended,
					sessionsAttendedInPerson,
					count: 0,
					sum: 0,
					countPct: 0,
					sumPct: 0,
				};
			}
		}

		for (const sapin of sapins) {
			const m = entities[sapin];
			if (!statuses.includes(m.Status)) continue;
			const attendances = m.sessionAttendanceSummaries.filter(
				(a) =>
					selected.includes(a.session_id) &&
					(a.AttendancePercentage || 0) > 0
			);
			if (attendances.length > 0) {
				// For this individual...
				// attendances.length is the number of sessions attended
				const entry = data[attendances.length - 1];
				// inPersonCount is the number of sessions attend in-person sessions
				const inPersonCount = attendances.filter(
					(a) => a.InPerson
				).length;
				// update the appropriate record
				entry[inPersonCount].count++;
			}
		}

		data.forEach((d) => {
			let total = 0;
			let sum = 0;
			d.forEach((d, i) => {
				total += d.count;
				if (i <= 1) sum = 0;
				sum += d.count;
				d.sum = sum;
			});
			d.forEach((d) => {
				d.countPct = (100 * d.count) / total;
				d.sumPct = (100 * d.sum) / total;
			});
		});

		return data;
	}, [entities, sapins, selected, statuses]);
}

export type AttendancePerSession = {
	sessionId: number;
	inPersonCount: number;
	inPersonCountPct: number;
	remoteCount: number;
	remoteCountPct: number;
};

export function useAttendancePerSession({
	selected,
	statuses,
}: {
	selected: number[];
	statuses: string[];
}) {
	const sapins = useAppSelector(selectSessionParticipationIds);
	const entities = useAppSelector(
		selectSessionParticipationWithMembershipAndSummary
	);

	return React.useMemo(() => {
		const dataEntities: Record<number, AttendancePerSession> = {};
		const data: AttendancePerSession[] = [];

		for (const sessionId of selected) {
			dataEntities[sessionId] = {
				sessionId,
				inPersonCount: 0,
				inPersonCountPct: 0,
				remoteCount: 0,
				remoteCountPct: 0,
			};
			data.push(dataEntities[sessionId]);
		}

		for (const sapin of sapins) {
			const m = entities[sapin];
			if (!statuses.includes(m.Status)) continue;
			for (const a of m.sessionAttendanceSummaries) {
				if (!selected.includes(a.session_id)) continue;
				if ((a.AttendancePercentage || 0) <= 0) continue;
				const entry = dataEntities[a.session_id];
				if (a.InPerson) {
					entry.inPersonCount++;
				} else {
					entry.remoteCount++;
				}
			}
		}

		data.forEach((entry) => {
			const total = entry.inPersonCount + entry.remoteCount;
			entry.inPersonCountPct = (100 * entry.inPersonCount) / total;
			entry.remoteCountPct = (100 * entry.remoteCount) / total;
		});

		return data;
	}, [entities, sapins, selected, statuses]);
}
