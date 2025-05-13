import { lazy } from "react";
import { RouteObject } from "react-router";
import {
	sessionAttendanceLoader,
	sessionAttendanceChartLoader,
} from "./loader";

const SessionAttendance = lazy(() => import("./layout"));
const SessionAttendanceChart = lazy(() => import("./chart"));
const SessionAttendanceTable = lazy(() => import("./table"));
const SessionRegistrationTable = lazy(() => import("./registration"));

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
