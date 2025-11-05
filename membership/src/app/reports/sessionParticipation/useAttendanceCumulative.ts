import * as React from "react";
import { useOutletContext } from "react-router";
import { useAppSelector } from "@/store/hooks";
import {
	selectSessionParticipationIds,
	selectSessionParticipationWithMembershipAndSummary,
} from "@/store/sessionParticipation";
import { SessionParticipationReportContext } from "./layout";

export type AttendanceCumulative = {
	sessionsAttended: number;
	sessionsAttendedInPerson: number;
	count: number;
	sum: number;
	countPct: number;
	sumPct: number;
};

export function useAttendanceCumulative() {
	const { selected, statuses } =
		useOutletContext<SessionParticipationReportContext>();
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
