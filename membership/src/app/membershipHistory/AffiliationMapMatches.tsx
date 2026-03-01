import * as React from "react";
import { AffiliationMapCreate, matchRegExp } from "@/store/affiliationMap";
import { useAppSelector } from "@/store/hooks";
import { selectActiveMembers } from "@/store/members";

export function AffiliationMapMatches({ map }: { map: AffiliationMapCreate }) {
	const members = useAppSelector(selectActiveMembers);
	const matchedMembers = React.useMemo(() => {
		const re = matchRegExp(map.match);
		if (!re) return [];
		return members.filter((m) => re.test(m.Affiliation));
	}, [members, map.match]);

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span>{`${matchedMembers.length} matches:`}</span>
			{matchedMembers.map((m) => (
				<span key={m.SAPIN}>{m.Affiliation}</span>
			))}
		</div>
	);
}
