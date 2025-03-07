import { RouteObject } from "react-router";
import { SessionParticipationReport } from "./layout";
import { sessionParticipationLoader } from "../../sessionParticipation/loader";
import { PerSessionChart } from "./PerSessionChart";
import { CumulativeChart } from "./CumulativeChart";

export const route: RouteObject = {
	path: "sessionParticipation",
	element: <SessionParticipationReport />,
	loader: sessionParticipationLoader,
	children: [
		{ path: "per-session", element: <PerSessionChart /> },
		{ path: "cumulative", element: <CumulativeChart /> },
	],
};
