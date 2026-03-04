import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "../../sessionParticipation/loader";
import SessionParticipationReport from "./layout";

const PerSessionChart = lazy(() => import("./AttendancePerSessionChart"));
const CumulativeChart = lazy(() => import("./AttendanceCumulativeChart"));
const ByAffiliationChart = lazy(() => import("./AttendanceByAffiliationChart"));

export const route: RouteObject = {
	element: <SessionParticipationReport />,
	loader,
	children: [
		{
			path: "per-session",
			hydrateFallbackElement: <div>Loading...</div>,
			element: <PerSessionChart />,
		},
		{
			path: "cumulative",
			hydrateFallbackElement: <div>Loading...</div>,
			element: <CumulativeChart />,
		},
		{
			path: "by-affiliation",
			hydrateFallbackElement: <div>Loading...</div>,
			element: <ByAffiliationChart />,
		},
	],
};
