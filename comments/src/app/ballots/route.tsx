import { RouteObject } from "react-router";

import { loader } from "./loader";
import AppError from "../errorPage";
import Ballots from "./main";

const route: RouteObject = {
	loader,
	errorElement: <AppError />,
	Component: Ballots,
};

export default route;
