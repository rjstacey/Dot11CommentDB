import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";

const SessionAttendanceReport = lazy(() => import("."));
const SessionAttendanceChart = lazy(() => import("./chart"));

export const route: RouteObject = {
	path: "sessionAttendance",
	element: <SessionAttendanceReport />,
	children: [
		{ path: ":sessionNumber", loader, element: <SessionAttendanceChart /> },
	],
};
