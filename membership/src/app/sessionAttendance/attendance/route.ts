import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";

const route: RouteObject = {
	loader,
	Component: lazy(() => import(".")),
};

export default route;
