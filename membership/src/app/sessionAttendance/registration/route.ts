import * as React from "react";
import { RouteObject } from "react-router";

const route: RouteObject = {
	Component: React.lazy(() => import(".")),
};

export default route;
