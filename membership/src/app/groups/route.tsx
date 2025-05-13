import { lazy } from "react";
import { RouteObject } from "react-router";
import { groupsLoader } from "./loader";

const Groups = lazy(() => import("./Groups"));

export const groupsRoute: RouteObject = {
	element: <Groups />,
	loader: groupsLoader,
};
