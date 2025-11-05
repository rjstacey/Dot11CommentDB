import { RouteObject, Navigate } from "react-router";
import { route as sessionParticipationRoute } from "./sessionParticipation/route";
import { route as sessionAttendanceRoute } from "./sessionAttendance/route";
import { route as membersByAffiliationRoute } from "./membersByAffiliation/route";

import ReportsLayout from "./layout";

export const reportsRoute: RouteObject = {
	Component: ReportsLayout,
	children: [
		{ index: true, element: <Navigate to="members" /> },
		{ path: "members", ...membersByAffiliationRoute },
		{ path: "sessionParticipation", ...sessionParticipationRoute },
		{ path: "sessionAttendance", ...sessionAttendanceRoute },
	],
};
