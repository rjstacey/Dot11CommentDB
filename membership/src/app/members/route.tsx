import { RouteObject } from "react-router";
import { membersLoader } from "./loader";
import MembersLayout from "./layout";

export const membersRoute: RouteObject = {
	element: <MembersLayout />,
	loader: membersLoader,
};
