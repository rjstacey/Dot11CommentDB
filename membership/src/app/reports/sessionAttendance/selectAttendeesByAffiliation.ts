import { createSelector } from "@reduxjs/toolkit";
import { selectAffiliationMapper } from "@/store/affiliationMap";
import {
	selectImatAttendanceSummarySyncedEntities,
	selectImatAttendanceSummarySyncedIds,
	SyncedSessionAttendee,
} from "@/store/imatAttendanceSummary";

export const series = {
	Voter: "Voter",
	"Potential Voter": "Potential Voter",
	Aspirant: "Aspirant",
	New: "New",
} as const;
const keys = Object.keys(series) as (keyof typeof series)[];

const isCountedStatus = (s: string): s is (typeof keys)[number] =>
	(keys as readonly string[]).includes(s);

type StatusCountRecord = Record<(typeof keys)[number], number>;

const nullEntry: StatusCountRecord = {
	Aspirant: 0,
	"Potential Voter": 0,
	Voter: 0,
	New: 0,
};

export const selectAttendeesByAffiliation = createSelector(
	selectImatAttendanceSummarySyncedIds,
	selectImatAttendanceSummarySyncedEntities,
	selectAffiliationMapper,
	(attendeeIds, attendeeEntities, affiliationMapper) => {
		const membersEntities: Record<string, SyncedSessionAttendee[]> = {};
		let shortAffiliations: string[] = [];
		for (const id of attendeeIds) {
			const m = attendeeEntities[id];
			if (!m.AttendancePercentage) continue;
			const affiliation = affiliationMapper(m.Affiliation);
			if (shortAffiliations.includes(affiliation)) {
				membersEntities[affiliation].push(m);
			} else {
				shortAffiliations.push(affiliation);
				membersEntities[affiliation] = [m];
			}
		}
		const entities: Record<string, StatusCountRecord> = {};
		for (const id of shortAffiliations) {
			const entry = { ...nullEntry };
			for (const m of membersEntities[id]) {
				let status = m.Status;
				if (status === "Non-Voter") status = "New";
				if (isCountedStatus(status)) entry[status]++;
			}
			entities[id] = entry;
		}
		function idsComp(id1: string, id2: string) {
			const e1 = entities[id1];
			const e2 = entities[id2];
			let n = e2.Voter - e1.Voter;
			if (n === 0) n = e2["Potential Voter"] - e1["Potential Voter"];
			if (n === 0) n = e2.Aspirant - e1.Aspirant;
			if (n === 0) n = e2.New - e1.New;
			return n;
		}
		shortAffiliations = shortAffiliations.sort(idsComp);

		const entry = { ...nullEntry };
		const ids: string[] = [];
		shortAffiliations.forEach((id) => {
			const entity = entities[id];
			const total =
				entity["New"] +
				entity["Aspirant"] +
				entity["Potential Voter"] +
				entity["Voter"];
			if (total <= 1 || id === "No affiliation") {
				entry["New"] += entity["New"];
				entry["Aspirant"] += entity["Aspirant"];
				entry["Potential Voter"] += entity["Potential Voter"];
				entry["Voter"] += entity["Voter"];
			} else {
				ids.push(id);
			}
		});
		const id = "Single or no affiliation";
		entities[id] = entry;
		ids.push(id);

		return { ids, entities };
	}
);
