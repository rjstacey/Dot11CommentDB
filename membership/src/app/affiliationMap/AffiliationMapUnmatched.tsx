import * as React from "react";
import { selectAffiliationMaps, matchRegExp } from "@/store/affiliationMap";
import { useAppSelector } from "@/store/hooks";
import { selectActiveMembers } from "@/store/members";

function AffiliationMapUnmatched() {
	const maps = useAppSelector(selectAffiliationMaps);
	const members = useAppSelector(selectActiveMembers);
	const unmatchedMembers = React.useMemo(() => {
		let unmatched = members.map((m) => m.Affiliation);
		for (const map of maps) {
			const re = matchRegExp(map.match);
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
