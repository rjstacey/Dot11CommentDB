import { NavLink } from "react-router";
import { ActionButton } from "dot11-components";
import { copyChartToClipboard } from "@/components/copyChart";

export function ReportsNav() {
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<ActionButton
				name="copy"
				title="Copy chart to clipboard"
				onClick={() => copyChartToClipboard("#chart")}
			/>
			<NavLink to="/reports/members">Members by Affiliation</NavLink>
			<NavLink to="/reports/sessionParticipation/per-session">
				Per Session Participation
			</NavLink>
			<NavLink to="sessionParticipation/cumulative">
				Cumulative Session Participation
			</NavLink>
		</div>
	);
}
