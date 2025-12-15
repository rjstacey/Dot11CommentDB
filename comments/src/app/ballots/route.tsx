import type { RouteObject } from "react-router";

import { loader } from "./loader";
import AppError from "../errorPage";
import { BallotsMain } from "./main";

const route: RouteObject = {
	loader,
	errorElement: <AppError />,
	Component: BallotsMain,
};

export default route;
