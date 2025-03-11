import { RouteObject } from "react-router";
import { SessionAttendance } from "./layout";
import { SessionAttendanceTable } from "./table";
import { SessionAttendanceChart } from "./chart";
import { SessionRegistrationTable } from "./registration";
import {
	sessionAttendanceLoader,
	sessionAttendanceChartLoader,
} from "./loader";

export const sessionAttendanceRoute: RouteObject = {
	element: <SessionAttendance />,
	loader: sessionAttendanceLoader,
	children: [
		{ index: true, element: null },
		{
			path: ":sessionNumber",
			children: [
				{ index: true, element: <SessionAttendanceTable /> },
				{
					path: "chart",
					loader: sessionAttendanceChartLoader,
					element: <SessionAttendanceChart />,
				},
				{ path: "registration", element: <SessionRegistrationTable /> },
			],
		},
	],
};
