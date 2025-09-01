import * as React from "react";
import { RouteObject } from "react-router";
import { loader } from "../../sessionParticipation/loader";
import SessionParticipationReport from "./layout";

const PerSessionChart = React.lazy(() => import("./PerSessionChart"));
const CumulativeChart = React.lazy(() => import("./CumulativeChart"));

export const route: RouteObject = {
	element: <SessionParticipationReport />,
	loader,
	children: [
		{
			path: "per-session",
			element: (
				<React.Suspense fallback={<div>Loading...</div>}>
					<PerSessionChart />
				</React.Suspense>
			),
		},
		{
			path: "cumulative",
			element: (
				<React.Suspense fallback={<div>Loading...</div>}>
					<CumulativeChart />
				</React.Suspense>
			),
		},
	],
};
