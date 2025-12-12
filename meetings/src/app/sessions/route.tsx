import type { RouteObject } from "react-router";
import { loader } from "./loader";
import { SessionsLayout } from "./layout";

const route: RouteObject = {
	element: <SessionsLayout />,
	loader,
};

export default route;
