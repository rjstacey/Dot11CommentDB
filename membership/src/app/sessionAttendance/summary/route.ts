import * as React from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";

const route: RouteObject = {
	loader,
	Component: React.lazy(() => import(".")),
};

export default route;
