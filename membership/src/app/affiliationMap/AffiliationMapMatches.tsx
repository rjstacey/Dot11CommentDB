import * as React from "react";
import { AffiliationMap } from "@/store/affiliationMap";
import { useAppSelector } from "@/store/hooks";
import { selectActiveMembers } from "@/store/members";

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

function AffiliationMapMatches({ map }: { map: AffiliationMap }) {
	const members = useAppSelector(selectActiveMembers);
	const matchedMembers = React.useMemo(() => {
		const re = matchRegExp(map);
		if (!re) return [];
		return members.filter((m) => re.test(m.Affiliation));
	}, [members, map]);

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span>{`${matchedMembers.length} matches:`}</span>
			{matchedMembers.map((m) => (
				<span>{m.Affiliation}</span>
			))}
		</div>
	);
}

export default AffiliationMapMatches;
