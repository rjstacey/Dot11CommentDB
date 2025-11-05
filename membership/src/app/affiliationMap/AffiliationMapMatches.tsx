import * as React from "react";
import { AffiliationMap, matchRegExp } from "@/store/affiliationMap";
import { useAppSelector } from "@/store/hooks";
import { selectActiveMembers } from "@/store/members";

function AffiliationMapMatches({ map }: { map: AffiliationMap }) {
	const members = useAppSelector(selectActiveMembers);
	const matchedMembers = React.useMemo(() => {
		const re = matchRegExp(map.match);
		if (!re) return [];
		return members.filter((m) => re.test(m.Affiliation));
	}, [members, map]);

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span>{`${matchedMembers.length} matches:`}</span>
			{matchedMembers.map((m) => (
				<span key={m.SAPIN}>{m.Affiliation}</span>
			))}
		</div>
	);
}

export default AffiliationMapMatches;
