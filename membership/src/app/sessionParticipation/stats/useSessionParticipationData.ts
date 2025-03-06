import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import {
	selectSessionParticipationIds,
	selectSessionParticipationWithMembershipAndSummary,
} from "@/store/sessionParticipation";
import { selectSessionEntities } from "@/store/sessions";
import { displayDateRange } from "dot11-components";

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

export const statusOrder = [
	"Voter",
	"Potential Voter",
	"Aspirant",
	"Non-Voter",
];

export type AttendanceCount = {
	count: number;
	countPct: number;
	countPctSum: number;
};

export type AttendancePerSession = {
	sessionId: number;
	sessionLabel: string;
	inPerson: AttendanceCount[];
	remote: AttendanceCount[];
};

const sum = (array: number[]) =>
	array.reduce((partialSum, a) => partialSum + a, 0);

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
	const sessionEntities = useAppSelector(selectSessionEntities);

	return React.useMemo(() => {
		const dataEntities: Record<number, AttendancePerSession> = {};
		const data: AttendancePerSession[] = [];

		const sessions = selected
			.map((id) => sessionEntities[id]!)
			.filter(Boolean)
			.sort((s1, s2) => s1!.startDate.localeCompare(s2!.startDate));

		for (const s of sessions) {
			const empty: AttendanceCount = {
				count: 0,
				countPct: 0,
				countPctSum: 0,
			};
			const inPerson = Array(statusOrder.length)
				.fill(undefined)
				.map(() => Object.create(empty));
			const remote = Array(statusOrder.length)
				.fill(undefined)
				.map(() => Object.create(empty));

			const sessionLabel = `${s.number} ${s.type === "p" ? "Plenary: " : "Interim: "} ${displayDateRange(s.startDate, s.endDate)}`;
			dataEntities[s.id] = {
				sessionId: s.id,
				sessionLabel,
				inPerson,
				remote,
			};
			data.push(dataEntities[s.id]);
		}

		for (const sapin of sapins) {
			const m = entities[sapin];
			if (!statuses.includes(m.Status)) continue;
			const i = statusOrder.indexOf(m.Status);
			if (i < 0) continue;
			for (const a of m.sessionAttendanceSummaries) {
				if (!selected.includes(a.session_id)) continue;
				if ((a.AttendancePercentage || 0) <= 0) continue;
				const entry = dataEntities[a.session_id];
				if (a.InPerson) {
					entry.inPerson[i].count++;
				} else {
					entry.remote[i].count++;
				}
			}
		}

		data.forEach((entry) => {
			const total =
				sum(entry.inPerson.map((c) => c.count)) +
				sum(entry.remote.map((c) => c.count));
			for (let i = 0; i < statusOrder.length; i++) {
				const p = entry.inPerson[i];
				const r = entry.remote[i];
				p.countPct = (100 * p.count) / total;
				r.countPct = (100 * r.count) / total;
				p.countPctSum =
					(i === 0 ? 0 : entry.inPerson[i - 1].countPctSum) +
					p.countPct;
				r.countPctSum =
					(i === 0 ? 0 : entry.remote[i - 1].countPctSum) +
					r.countPct;
			}
		});

		return data;
	}, [entities, sapins, selected, statuses]);
}
