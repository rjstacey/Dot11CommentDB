import { RouteObject } from "react-router";

import ReportsLayout from "./layout";
import Reports from "./Reports";

import { indexLoader, ballotIdLoader, ErrorPage } from "../comments/route";

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
			errorElement: <ErrorPage />,
		},
	],
};

export default route;
