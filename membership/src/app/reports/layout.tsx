import { NavLink, Outlet } from "react-router";
import { ActionButton } from "dot11-components";
import { copyChartToClipboard, downloadChart } from "@/components/copyChart";
import css from "./reports.module.css";

export function Reports() {
	return (
		<div className={css.container}>
			<div className={css.nav}>
				<NavLink className={css.button} to="members">
					Members by Affiliation
				</NavLink>
				<NavLink
					className={css.button}
					to="sessionParticipation/per-session"
				>
					Per Session Participation
				</NavLink>
				<NavLink
					className={css.button}
					to="sessionParticipation/cumulative"
				>
					Cumulative Session Participation
				</NavLink>
			</div>
			<div className={css.main}>
				<div className={css.actionRow}>
					<ActionButton
						name="copy"
						title="Copy chart to clipboard"
						onClick={() => copyChartToClipboard("#chart")}
					/>
					<ActionButton
						name="export"
						title="Export chart"
						onClick={downloadChart}
					/>
				</div>
				<Outlet />
			</div>
		</div>
	);
}
