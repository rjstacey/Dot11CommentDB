import React from "react";
import { useAppSelector } from "../store/hooks";
import styled from "@emotion/styled";

import { selectMemberEntities } from "../store/members";

function selectMembersSummary(state: any) {
	const members = selectMemberEntities(state);
	const s = { nv: 0, a: 0, pv: 0, v: 0, eo: 0 };
	for (const m of Object.values(members)) {
		switch (m!.Status) {
			case "Non-Voter":
				s.nv++;
				break;
			case "Aspirant":
				s.a++;
				break;
			case "Potential Voter":
				s.pv++;
				break;
			case "Voter":
				s.v++;
				break;
			case "ExOfficio":
				s.eo++;
				break;
			default:
				break;
		}
	}
	return s;
}

const Container = styled.div`
	display: flex;
	align-items: center;
	width: 80%;
	padding: 0 10px 10px 10px;
	box-sizing: border-box;
`;

const LV = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-right: 20px;
	div:first-of-type {
		font-weight: bold;
		margin-right: 10px;
	}
`;

const LabelValue = ({ label, value }: { label: string; value: number }) => (
	<LV>
		<div>{label}</div>
		<div>{value}</div>
	</LV>
);

function MembersSummary(props: React.ComponentProps<typeof Container>) {
	const summary = useAppSelector(selectMembersSummary);

	return (
		<Container {...props}>
			<LabelValue label="Non-Voters" value={summary.nv} />
			<LabelValue label="Aspirants" value={summary.a} />
			<LabelValue label="Potential Voters" value={summary.pv} />
			<LabelValue label="Voters" value={summary.v} />
			<LabelValue label="ExOfficio" value={summary.eo} />
		</Container>
	);
}

export default MembersSummary;
