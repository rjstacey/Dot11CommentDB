import { NavLink } from "react-router";
import { Nav } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import {
	selectImatAttendanceSummaryState,
	selectImatAttendanceSummarySession,
} from "@/store/imatAttendanceSummary";

export function Menu() {
	const session = useAppSelector(selectImatAttendanceSummarySession);
	const { useDaily } = useAppSelector(selectImatAttendanceSummaryState);
	let sessionAttendanceLink = "sessionAttendance";
	if (session?.number) {
		sessionAttendanceLink += `/${session.number}`;
		if (useDaily) sessionAttendanceLink += "?useDaily=true";
	}

	return (
		<Nav variant="underline" className="flex-column">
			<Nav.Link as={NavLink} to="members">
				Members by Affiliation
			</Nav.Link>
			<Nav.Link as={NavLink} to={sessionAttendanceLink}>
				Session attendance
			</Nav.Link>
			<Nav.Link as={NavLink} to="sessionParticipation/per-session">
				Per Session Participation
			</Nav.Link>
			<Nav.Link as={NavLink} to="sessionParticipation/cumulative">
				Cumulative Session Participation
			</Nav.Link>
		</Nav>
	);
}

export default Menu;
