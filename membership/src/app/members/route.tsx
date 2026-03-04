import { RouteObject } from "react-router";
import { loader } from "./loader";
import { MembersLayout } from "./layout";

export const membersRoute: RouteObject = {
	element: <MembersLayout />,
	loader,
};
