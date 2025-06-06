import { lazy } from "react";
import { RouteObject } from "react-router";
import { sessionParticipationLoader } from "../../sessionParticipation/loader";

const SessionParticipationReport = lazy(() => import("./layout"));
const PerSessionChart = lazy(() => import("./PerSessionChart"));
const CumulativeChart = lazy(() => import("./CumulativeChart"));

export const route: RouteObject = {
	path: "sessionParticipation",
	element: <SessionParticipationReport />,
	loader: sessionParticipationLoader,
	children: [
		{ path: "per-session", element: <PerSessionChart /> },
		{ path: "cumulative", element: <CumulativeChart /> },
	],
};
