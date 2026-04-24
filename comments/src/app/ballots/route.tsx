import type { RouteObject } from "react-router";

import { loader } from "./loader";
import { AppErrorPage } from "../errorPage";
import { BallotsMain } from "./main";

const route: RouteObject = {
	loader,
	errorElement: <AppErrorPage />,
	Component: BallotsMain,
};

export default route;
