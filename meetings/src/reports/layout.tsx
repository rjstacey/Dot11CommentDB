import { Outlet, useNavigate, useParams } from "react-router-dom";

import { Button } from "dot11-components";

import ReportsActions from "./actions";

import styles from "./reports.module.css";

const actions = ["sessionAttendance", "teleconAttendance"] as const;
type Action = (typeof actions)[number];

const navLabels: { [K in Action]: string } = {
	sessionAttendance: "Session Attendance",
	teleconAttendance: "Telecon Attendance",
};

function ReportsNav() {
	const navigate = useNavigate();
	const { chart } = useParams();

	function handleAction(newAction: Action) {
		navigate(newAction === chart ? "" : newAction);
	}

	return (
		<div className="chart-select">
			{actions.map((a) => (
				<Button
					key={a}
					onClick={() => handleAction(a)}
					isActive={chart === a}
				>
					{navLabels[a]}
				</Button>
			))}
		</div>
	);
}

function ReportsLayout() {
	return (
		<>
			<ReportsActions />
			<div className={styles.main}>
				<ReportsNav />
				<Outlet />
			</div>
		</>
	);
}

export default ReportsLayout;
