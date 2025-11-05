import * as React from "react";
import { useOutletContext } from "react-router";
import { useAppSelector } from "@/store/hooks";
import {
	selectSessionParticipationIds,
	selectSessionParticipationWithMembershipAndSummary,
} from "@/store/sessionParticipation";
import { selectSessionEntities } from "@/store/sessions";
import { displayDateRange } from "@common";
import { SessionParticipationReportContext } from "./layout";

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

export function useAttendancePerSession() {
	const { selected, statuses } =
		useOutletContext<SessionParticipationReportContext>();
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

			const sessionLabel = `${s.number} ${
				s.type === "p" ? "Plenary: " : "Interim: "
			} ${displayDateRange(s.startDate, s.endDate)}`;
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
