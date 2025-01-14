import { RouteObject } from "react-router";

import ReportsLayout from "./layout";
import Reports from "./Reports";

import { indexLoader, ballotIdLoader } from "../comments/route";
import AppError from "../errorPage";

const route: RouteObject = {
	element: <ReportsLayout />,
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
