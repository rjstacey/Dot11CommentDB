import { RouteObject } from "react-router";
import { loader } from "./loader";
import SessionAttendanceReport from ".";
import SessionAttendanceChart from "./chart";

export const route: RouteObject = {
	element: <SessionAttendanceReport />,
	children: [
		{
			path: ":sessionNumber",
			loader,
			element: <SessionAttendanceChart />,
		},
	],
};
