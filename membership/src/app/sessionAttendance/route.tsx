import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";

const SessionAttendanceLayout = lazy(() => import("./layout"));
const SessionAttendanceTable = lazy(() => import("./table"));
const SessionRegistrationTable = lazy(() => import("./registration"));

export const sessionAttendanceRoute: RouteObject = {
	element: <SessionAttendanceLayout />,
	children: [
		{ index: true, element: null },
		{
			path: ":sessionNumber",
			loader,
			children: [
				{ index: true, element: <SessionAttendanceTable /> },
				{ path: "registration", element: <SessionRegistrationTable /> },
			],
		},
	],
};
