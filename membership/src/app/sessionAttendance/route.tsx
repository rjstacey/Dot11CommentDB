import { RouteObject, Navigate } from "react-router";
import { indexLoader, sessionAttendanceLoader } from "./loader";
import SessionAttendanceLayout from "./layout";

import imatRoute from "./imat/route";
import registrationRoute from "./registration/route";
import summaryRoute from "./summary/route";

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
				{ index: true, element: <Navigate to="imat" /> },
				{ path: "imat", ...imatRoute },
				{ path: "summary", ...summaryRoute },
				{ path: "registration", ...registrationRoute },
			],
		},
	],
};
