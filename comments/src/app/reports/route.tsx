import { RouteObject } from "react-router";
import { indexLoader, ballotIdLoader } from "../comments/loader";
import AppError from "../errorPage";
import { ReportsRootLayout } from "./layout";
import { ReportsMainLayout } from "./main";
import { Report } from "./Report";

const route: RouteObject = {
	element: <ReportsRootLayout />,
	children: [
		{
			index: true,
			loader: indexLoader,
			element: null,
		},
		{
			path: ":ballotId",
			loader: ballotIdLoader,
			element: <ReportsMainLayout />,
			errorElement: <AppError />,
			children: [
				{
					path: ":report",
					element: <Report />,
				},
			],
		},
	],
};

export default route;
