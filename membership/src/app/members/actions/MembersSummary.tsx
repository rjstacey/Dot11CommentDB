import { Col, Table } from "react-bootstrap";
import { createSelector } from "@reduxjs/toolkit";

import { useAppSelector } from "@/store/hooks";
import { selectMemberEntities, MemberStatus } from "@/store/members";

type MemberSummary = Partial<Record<MemberStatus, number>>;

const selectMembersSummary = createSelector(selectMemberEntities, (members) => {
	const s: MemberSummary = {
		"Non-Voter": 0,
		Observer: 0,
		Aspirant: 0,
		"Potential Voter": 0,
		Voter: 0,
		ExOfficio: 0,
	};
	for (const m of Object.values(members)) if (m!.Status in s) s[m!.Status]!++;
	return s;
});

export function MembersSummary(props: React.ComponentProps<typeof Col>) {
	const summary = useAppSelector(selectMembersSummary);

	return (
		<Col {...props}>
			<Table bordered responsive>
				<thead>
					<tr>
						{Object.keys(summary).map((key) => (
							<th key={key}>{key}</th>
						))}
					</tr>
				</thead>
				<tbody>
					<tr>
						{Object.values(summary).map((key) => (
							<td key={key} className="text-center">
								{key}
							</td>
						))}
					</tr>
				</tbody>
			</Table>
		</Col>
	);
}
