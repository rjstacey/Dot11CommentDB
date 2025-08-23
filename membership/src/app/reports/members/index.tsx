import * as React from "react";
import { createSelector } from "@reduxjs/toolkit";
import { Ratio } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { AffiliationMap, selectAffiliationMaps } from "@/store/affiliationMap";
import { selectActiveMembers, Member } from "@/store/members";

import StackedBarChart from "@/components/StackedBarChart";
import { useDimensions } from "../useDimensions";

const countedStatus = ["Voter", "Potential Voter", "Aspirant"] as const;
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
	} catch {
		return;
	}
	return re;
}

const nullEntry: StatusCountRecord = {
	Aspirant: 0,
	"Potential Voter": 0,
	Voter: 0,
};

const membersByAffiliation = createSelector(
	selectActiveMembers,
	selectAffiliationMaps,
	(members, maps) => {
		const membersEntities: Record<string, Member[]> = {};
		let shortAffiliations: string[] = [];
		for (const m of members) {
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
				if (isCountedStatus(m.Status)) entry[m.Status]++;
			}
			entities[id] = entry;
		}
		function idsComp(id1: string, id2: string) {
			const e1 = entities[id1];
			const e2 = entities[id2];
			let n = e2.Voter - e1.Voter;
			if (n === 0) n = e2["Potential Voter"] - e1["Potential Voter"];
			if (n === 0) n = e2.Aspirant - e1.Aspirant;
			return n;
		}
		shortAffiliations = shortAffiliations.sort(idsComp);

		const entry = { ...nullEntry };
		const ids: string[] = [];
		shortAffiliations.forEach((id) => {
			const entity = entities[id];
			const total =
				entity["Aspirant"] +
				entity["Potential Voter"] +
				entity["Voter"];
			if (total <= 1 || id === "No affiliation") {
				entry.Aspirant += entity.Aspirant;
				entry["Potential Voter"] += entity["Potential Voter"];
				entry.Voter += entity.Voter;
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

export function MembersChart() {
	const { ids, entities } = useAppSelector(membersByAffiliation);
	const { ref, width, height } = useDimensions();

	return (
		<Ratio ref={ref} aspectRatio="16x9">
			<StackedBarChart
				width={width}
				height={height}
				keys={countedStatus}
				ids={ids}
				entities={entities}
				yLabel="Number of members"
			/>
		</Ratio>
	);
}

export default MembersChart;
