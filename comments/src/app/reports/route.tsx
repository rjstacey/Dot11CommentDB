import { RouteObject } from "react-router";

import Reports from "./Reports";

import { indexLoader, ballotIdLoader } from "../comments/loader";
import AppError from "../errorPage";

const route: RouteObject = {
	children: [
		{
			index: true,
			loader: indexLoader,
			element: null,
		},
		{
			path: ":ballotId",
			loader: ballotIdLoader,
			element: <Reports />,
			errorElement: <AppError />,
		},
	],
};

export default route;
