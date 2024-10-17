import { createSelector } from "@reduxjs/toolkit";
import AutoSizer from "react-virtualized-auto-sizer";

import { useAppSelector } from "../store/hooks";
import { AffiliationMap, selectAffiliationMaps } from "../store/affiliationMap";
import {
	selectSyncedSessionAtendeeEntities,
	selectSessionAttendeesIds,
	SyncedSessionAttendee,
} from "../store/sessionAttendees";
import StackedBarChart from "../components/StackedBarChart";

const countedStatus = ["Voter", "Potential Voter", "Aspirant", "New"] as const;
const isCountedStatus = (s: string): s is (typeof countedStatus)[number] =>
	(countedStatus as readonly string[]).includes(s);

type StatusCountRecord = Record<(typeof countedStatus)[number], number>;

function matchRegExp(map: AffiliationMap) {
	const parts = map.match.split("/");
	let re: RegExp;
	try {
		if ((parts.length === 2 || parts.length === 3) && parts[0] === "")
			re = new RegExp(parts[1], parts[2]);
		else re = new RegExp(map.match);
	} catch (error) {
		return;
	}
	return re;
}

const nullEntry: StatusCountRecord = {
	Aspirant: 0,
	"Potential Voter": 0,
	Voter: 0,
	New: 0,
};

const attendeesByAffiliation = createSelector(
	selectSessionAttendeesIds,
	selectSyncedSessionAtendeeEntities,
	selectAffiliationMaps,
	(attendeeIds, attendeeEntities, maps) => {
		const membersEntities: Record<string, SyncedSessionAttendee[]> = {};
		let shortAffiliations: string[] = [];
		for (const id of attendeeIds) {
			const m = attendeeEntities[id];
			let affiliation = m.Affiliation;
			for (const map of maps) {
				const re = matchRegExp(map);
				if (re && re.test(affiliation)) {
					affiliation = map.shortAffiliation;
					break;
				}
			}
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
		shortAffiliations.forEach((id, i) => {
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

function SessionAttendanceChart() {
	const { ids, entities } = useAppSelector(attendeesByAffiliation);

	return (
		<div style={{ flex: 1, width: "100%" }}>
			<AutoSizer>
				{({ height, width }: { height: number; width: number }) => {
					// Rescale to create 16:9
					if ((16 / 9) * height > width) height = (9 * width) / 16;
					else width = (16 * height) / 9;
					return (
						<StackedBarChart
							width={width}
							height={height}
							keys={countedStatus}
							ids={ids}
							entities={entities}
							yLabel="Number of attendees"
						/>
					);
				}}
			</AutoSizer>
		</div>
	);
}

export default SessionAttendanceChart;
