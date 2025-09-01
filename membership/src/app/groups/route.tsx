import { RouteObject } from "react-router";
import { groupsLoader } from "./loader";
import Groups from "./main";

export const groupsRoute: RouteObject = {
	Component: Groups,
	loader: groupsLoader,
};
