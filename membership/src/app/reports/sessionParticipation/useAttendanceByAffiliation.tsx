import * as React from "react";
import { useOutletContext } from "react-router";
import { useAppSelector } from "@/store/hooks";
import { AffiliationMap, selectAffiliationMaps } from "@/store/affiliationMap";
import { selectActiveMembers } from "@/store/members";
import { selectSessionParticipationWithMembershipAndSummary } from "@/store/sessionParticipation";
import { SessionParticipationReportContext } from "./layout";

function matchRegExp(map: AffiliationMap) {
	const parts = map.match.split("/");
	let re: RegExp;
	try {
		if ((parts.length === 2 || parts.length === 3) && parts[0] === "")
			re = new RegExp(parts[1], parts[2]);
		else re = new RegExp(map.match);
	} catch {
		return;
	}
	return re;
}

export const series = {
	inPerson: "≥1 In-Person",
	remoteOnly: "Remote-Only",
} as const;

export type AffiliationCounts = {
	attendees: number;
} & Record<keyof typeof series, number>;

const zeroCounts: AffiliationCounts = {
	attendees: 0,
	inPerson: 0,
	remoteOnly: 0,
};

export function useAttendanceByAffiliation() {
	const { selected, statuses } =
		useOutletContext<SessionParticipationReportContext>();
	const participationEntities = useAppSelector(
		selectSessionParticipationWithMembershipAndSummary
	);
	const members = useAppSelector(selectActiveMembers);
	const affiliationMaps = useAppSelector(selectAffiliationMaps);

	return React.useMemo(() => {
		const entities: Record<string, AffiliationCounts> = {};
		let shortAffiliations: string[] = [];
		for (const m of members) {
			if (!statuses.includes(m.Status)) continue;

			let totalCount = 0;
			let inPersonCount = 0;

			const s = participationEntities[m.SAPIN];
			if (s) {
				const attendances = s.sessionAttendanceSummaries.filter(
					(a) =>
						selected.includes(a.session_id) &&
						(a.AttendancePercentage || 0) > 0
				);
				totalCount = attendances.length;
				inPersonCount = attendances.filter((a) => a.InPerson).length;
			}

			let affiliation = m.Affiliation;
			for (const map of affiliationMaps) {
				const re = matchRegExp(map);
				if (re && re.test(affiliation)) {
					affiliation = map.shortAffiliation;
					break;
				}
			}
			if (!shortAffiliations.includes(affiliation)) {
				shortAffiliations.push(affiliation);
				entities[affiliation] = { ...zeroCounts };
			}
			const entry = entities[affiliation];
			entry.attendees++;
			if (inPersonCount >= 1) entry.inPerson++;
			else if (totalCount >= 1) entry.remoteOnly++;
		}

		// Sort affiliations by number of attendees
		function idsComp(id1: string, id2: string) {
			const e1 = entities[id1];
			const e2 = entities[id2];
			let n = e2.attendees - e1.attendees;
			if (n === 0) n = e2.inPerson - e1.inPerson;
			return n;
		}
		shortAffiliations = shortAffiliations.sort(idsComp);

		// Combine single-attendee and no-affiliation into one entry
		const entry = { ...zeroCounts };
		const ids: string[] = [];
		shortAffiliations.forEach((id) => {
			const entity = entities[id];
			if (entity.attendees <= 1 || id === "No affiliation") {
				entry.attendees += entity.attendees;
				entry.inPerson += entity.inPerson;
				entry.remoteOnly += entity.remoteOnly;
			} else {
				ids.push(id);
			}
		});
		const id = "Single or no affiliation";
		entities[id] = entry;
		ids.push(id);

		return { ids, entities };
	}, [participationEntities, members, selected, statuses, affiliationMaps]);
}
