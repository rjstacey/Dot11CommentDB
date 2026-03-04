import { RouteObject } from "react-router";
import { loader } from "../../sessionParticipation/loader";
import SessionParticipationReport from "./layout";
import AttendancePerSessionChart from "./AttendancePerSessionChart";
import AttendanceCumulativeChart from "./AttendanceCumulativeChart";
import AttendanceByAffiliationChart from "./AttendanceByAffiliationChart";

export const route: RouteObject = {
	element: <SessionParticipationReport />,
	loader,
	children: [
		{
			path: "per-session",
			element: <AttendancePerSessionChart />,
		},
		{
			path: "cumulative",
			element: <AttendanceCumulativeChart />,
		},
		{
			path: "by-affiliation",
			element: <AttendanceByAffiliationChart />,
		},
	],
};
