import { RouteObject } from "react-router";
import Groups from "./Groups";
import { groupsLoader } from "./loader";

export const groupsRoute: RouteObject = {
	element: <Groups />,
	loader: groupsLoader,
};
