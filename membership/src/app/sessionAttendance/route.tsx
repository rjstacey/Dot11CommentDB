import { RouteObject, Navigate } from "react-router";
import { indexLoader, sessionAttendanceLoader } from "./loader";
import SessionAttendanceLayout from "./layout";

import attendanceRoute from "./attendance/route";
import registrationRoute from "./registration/route";

export const sessionAttendanceRoute: RouteObject = {
	Component: SessionAttendanceLayout,
	children: [
		{
			index: true,
			loader: indexLoader,
		},
		{
			path: ":sessionNumber",
			loader: sessionAttendanceLoader,
			children: [
				{ index: true, element: <Navigate to="attendance" /> },
				{ path: "attendance", ...attendanceRoute },
				{ path: "registration", ...registrationRoute },
			],
		},
	],
};
