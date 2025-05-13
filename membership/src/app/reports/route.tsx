import { lazy } from "react";
import { RouteObject } from "react-router";
import { membersLoader } from "../members/loader";
import { route as sessionParticipationRoute } from "./sessionParticipation/route";

const Reports = lazy(() => import("./layout"));
const MembersChart = lazy(() => import("./members"));

export const reportsRoute: RouteObject = {
	element: <Reports />,
	children: [
		{ index: true, element: null },
		{ path: "members", loader: membersLoader, element: <MembersChart /> },
		sessionParticipationRoute,
	],
};
