import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";
import SessionAttendanceReport from ".";

const SessionAttendanceChart = lazy(() => import("./chart"));

export const route: RouteObject = {
	element: <SessionAttendanceReport />,
	children: [
		{
			path: ":sessionNumber",
			loader,
			hydrateFallbackElement: <div>Loading...</div>,
			element: <SessionAttendanceChart />,
		},
	],
};
