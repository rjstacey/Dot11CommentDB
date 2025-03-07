import { RouteObject } from "react-router";
import { Reports } from "./layout";
import { MembersChart } from "./members";
import { membersLoader } from "../members/loader";
import { route as sessionParticipationRoute } from "./sessionParticipation/route";

export const reportsRoute: RouteObject = {
	element: <Reports />,
	children: [
		{ index: true, element: null },
		{ path: "members", loader: membersLoader, element: <MembersChart /> },
		sessionParticipationRoute,
	],
};
