import { lazy } from "react";
import { RouteObject } from "react-router";
import { membersLoader } from "./loader";

const Members = lazy(() => import("./layout"));
const MembersTable = lazy(() => import("./table"));
const RosterTable = lazy(() => import("./roster"));

export const membersRoute: RouteObject = {
	element: <Members />,
	loader: membersLoader,
	children: [
		{ index: true, element: <MembersTable /> },
		{ path: "roster", element: <RosterTable /> },
	],
};
