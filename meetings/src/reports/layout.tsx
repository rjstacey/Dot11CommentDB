import {
	Outlet,
	useLoaderData,
	useLocation,
	useNavigate,
	useParams,
} from "react-router-dom";

import { Button } from "dot11-components";

import ReportsActions from "./actions";

import styles from "./reports.module.css";
import { LoaderData } from "./route";

const charts = ["sessionAttendance", "teleconAttendance"] as const;
type Action = (typeof charts)[number];

const navLabels: { [K in Action]: string } = {
	sessionAttendance: "Session Attendance",
	teleconAttendance: "Telecon Attendance",
};

function ReportsNav() {
	const navigate = useNavigate();
	const location = useLocation();
	const { chart } = useParams();

	function handleAction(newAction: Action) {
		navigate({
			pathname: newAction === chart ? "" : newAction,
			search: location.search,
		});
	}

	return (
		<div className="chart-select">
			{charts.map((a) => (
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
	const session = useLoaderData() as LoaderData;
	return (
		<>
			<ReportsActions />
			{session && (
				<div className={styles.main}>
					<ReportsNav />
					<Outlet />
				</div>
			)}
		</>
	);
}

export default ReportsLayout;
