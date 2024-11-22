import React from "react";
import { createSelector } from "@reduxjs/toolkit";

import { useAppSelector } from "../store/hooks";
import { selectMemberEntities } from "../store/members";

import styles from "./MembersSummary.module.css";

const selectMembersSummary = createSelector(selectMemberEntities, (members) => {
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
});

const LabelValue = ({ label, value }: { label: string; value: number }) => (
	<div className={styles.labelValue}>
		<label>{label}</label>
		<div>{value}</div>
	</div>
);

function MembersSummary(props: React.ComponentProps<"div">) {
	const summary = useAppSelector(selectMembersSummary);

	return (
		<div className={styles.container} {...props}>
			<LabelValue label="Non-Voters" value={summary.nv} />
			<LabelValue label="Aspirants" value={summary.a} />
			<LabelValue label="Potential Voters" value={summary.pv} />
			<LabelValue label="Voters" value={summary.v} />
			<LabelValue label="ExOfficio" value={summary.eo} />
		</div>
	);
}

export default MembersSummary;
