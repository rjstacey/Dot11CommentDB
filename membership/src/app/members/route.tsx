import { RouteObject } from "react-router";
import { Members } from "./layout";
import { membersLoader } from "./loader";
import { MembersTable } from "./table";
import { RosterTable } from "./roster";

export const membersRoute: RouteObject = {
	element: <Members />,
	loader: membersLoader,
	children: [
		{ index: true, element: <MembersTable /> },
		{ path: "roster", element: <RosterTable /> },
	],
};
