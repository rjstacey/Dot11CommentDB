import { NavLink, Outlet } from "react-router";

export function Reports() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				flex: 1,
				width: "100%",
			}}
		>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<NavLink to="members">Members by Affiliation</NavLink>
				<NavLink to="sessionParticipation/per-session">
					Per Session Participation
				</NavLink>
				<NavLink to="sessionParticipation/cumulative">
					Cumulative Session Participation
				</NavLink>
			</div>
			<Outlet />
		</div>
	);
}
