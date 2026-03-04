import { lazy } from "react";
import { RouteObject } from "react-router";

const route: RouteObject = {
	Component: lazy(() => import(".")),
};

export default route;
