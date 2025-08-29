import { lazy } from "react";
import { RouteObject } from "react-router";
import { indexLoader, sessionAttendanceLoader } from "./loader";

const SessionAttendanceLayout = lazy(() => import("./layout"));
const SessionAttendanceTable = lazy(() => import("./main"));
const SessionRegistrationTable = lazy(() => import("./registration"));

export const sessionAttendanceRoute: RouteObject = {
	element: <SessionAttendanceLayout />,
	children: [
		{
			index: true,
			loader: indexLoader,
			element: (
				<div
					className="d-flex flex-column w-100 h-100"
					style={{
						order: 10,
					}}
				/>
			),
		},
		{
			path: ":sessionNumber",
			loader: sessionAttendanceLoader,
			children: [
				{ index: true, element: <SessionAttendanceTable /> },
				{ path: "registration", element: <SessionRegistrationTable /> },
			],
		},
	],
};
