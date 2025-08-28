import { lazy } from "react";
import { RouteObject } from "react-router";
import { membersLoader } from "./loader";

const MembersLayout = lazy(() => import("./layout"));
const MembersTable = lazy(() => import("./main"));
const RosterTable = lazy(() => import("./roster"));

export const membersRoute: RouteObject = {
	element: <MembersLayout />,
	loader: membersLoader,
	children: [
		{ index: true, element: <MembersTable /> },
		{ path: "roster", element: <RosterTable /> },
	],
};
