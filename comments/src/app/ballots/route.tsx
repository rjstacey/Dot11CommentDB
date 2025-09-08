import { RouteObject } from "react-router";

import { loader } from "./loader";
import AppError from "../errorPage";
import Ballots from "./main";
import epollsRoute from "./epolls/route";

const route: RouteObject = {
	loader,
	errorElement: <AppError />,
	children: [
		{
			index: true,
			element: <Ballots />,
		},
		{
			path: "epolls",
			...epollsRoute,
		},
	],
};

export default route;
