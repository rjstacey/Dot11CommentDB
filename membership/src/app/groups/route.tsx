import { RouteObject } from "react-router";
import { loader } from "./loader";
import { GroupsMain } from "./main";

export const groupsRoute: RouteObject = {
	Component: GroupsMain,
	loader,
};
