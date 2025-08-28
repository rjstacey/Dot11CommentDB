import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import { selectMemberEntities } from "@/store/members";
import { type GroupWithOfficers } from "@/store/groups";

export function GroupOfficers({ group }: { group: GroupWithOfficers }) {
	const { officers } = group;
	const members = useAppSelector(selectMemberEntities);

	return (
		<div style={{ display: "grid", gridTemplateColumns: "150px auto" }}>
			{officers.map((officer) => {
				const member = members[officer.sapin];
				const name = member ? member.Name : "";
				return (
					<React.Fragment key={officer.id}>
						<div>{officer.position}</div>
						<div>{name}</div>
					</React.Fragment>
				);
			})}
		</div>
	);
}
