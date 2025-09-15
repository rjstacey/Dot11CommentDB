import { Outlet, useLocation, Link } from "react-router";

import { Container, Nav, NavLink } from "react-bootstrap";

import styles from "./reports.module.css";

const charts = ["sessionAttendance", "teleconAttendance"] as const;
type Action = (typeof charts)[number];

const navLabels: { [K in Action]: string } = {
	sessionAttendance: "Session Attendance",
	teleconAttendance: "Telecon Attendance",
};

function ReportsNav() {
	const { search } = useLocation();
	return (
		<Nav variant="underline" className="flex-column me-3">
			{charts.map((a) => (
				<NavLink key={a} as={Link} to={{ pathname: a, search }}>
					{navLabels[a]}
				</NavLink>
			))}
		</Nav>
	);
}

function ReportsLayout() {
	return (
		<Container className={styles.main}>
			<ReportsNav />
			<Outlet />
		</Container>
	);
}

export default ReportsLayout;
