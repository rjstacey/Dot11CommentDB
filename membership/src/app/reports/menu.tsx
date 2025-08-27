import { NavLink } from "react-router";
import { Nav } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import {
	selectSessionAttendeesState,
	selectSessionAttendeesSession,
} from "@/store/sessionAttendees";

export function Menu() {
	const session = useAppSelector(selectSessionAttendeesSession);
	const { useDaily } = useAppSelector(selectSessionAttendeesState);
	let sessionAttendanceLink = "sessionAttendance";
	if (session?.number) {
		sessionAttendanceLink += `/${session.number}`;
		if (useDaily) sessionAttendanceLink += "?useDaily=true";
	}

	return (
		<Nav variant="pills" className="flex-column">
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
