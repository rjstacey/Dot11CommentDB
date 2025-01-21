import * as React from "react";
import { AffiliationMap, selectAffiliationMaps } from "@/store/affiliationMap";
import { useAppSelector } from "@/store/hooks";
import { selectActiveMembers } from "@/store/members";

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

function AffiliationMapUnmatched() {
	const maps = useAppSelector(selectAffiliationMaps);
	const members = useAppSelector(selectActiveMembers);
	const unmatchedMembers = React.useMemo(() => {
		let unmatched = members.map((m) => m.Affiliation);
		for (const map of maps) {
			const re = matchRegExp(map);
			if (re) unmatched = unmatched.filter((m) => !re.test(m));
		}

		return unmatched.sort((a, b) => a.localeCompare(b));
	}, [members, maps]);

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span>{`${unmatchedMembers.length} unmatched affiliations:`}</span>
			{unmatchedMembers.map((m, i) => (
				<span key={i}>{m}</span>
			))}
		</div>
	);
}

export default AffiliationMapUnmatched;
