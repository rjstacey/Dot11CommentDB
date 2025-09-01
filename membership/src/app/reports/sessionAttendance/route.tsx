import * as React from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";
import SessionAttendanceReport from ".";

const SessionAttendanceChart = React.lazy(() => import("./chart"));

export const route: RouteObject = {
	element: <SessionAttendanceReport />,
	children: [
		{
			path: ":sessionNumber",
			loader,
			element: (
				<React.Suspense fallback={<div>Loading...</div>}>
					<SessionAttendanceChart />
				</React.Suspense>
			),
		},
	],
};
