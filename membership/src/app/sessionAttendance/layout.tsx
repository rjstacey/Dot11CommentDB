import { Routes, Route } from "react-router";
import { SessionAttendanceActions } from "./actions";
import { SessionAttendanceTable } from "./table";
import { SessionAttendanceChart } from "./chart";
import { SessionRegistrationTable } from "./registration";
import { sessionAttendanceChartLoader } from "./loader";

export function SessionAttendance() {
	return (
		<>
			<SessionAttendanceActions />
			<Routes>
				<Route path=":sessionNumber">
					<Route index element={<SessionAttendanceTable />} />
					<Route
						path="chart"
						loader={sessionAttendanceChartLoader}
						element={<SessionAttendanceChart />}
					/>
					<Route
						path="registration"
						element={<SessionRegistrationTable />}
					/>
				</Route>
			</Routes>
		</>
	);
}
