import type { RouteObject } from "react-router";
import { rootLoader, sessionsLoader } from "./loader";
import { ReportsLayout } from "./layout";
import { ReportsNavLayout } from "./navLayout";
import { ReportsChart } from "./chart";

const route: RouteObject = {
	element: <ReportsLayout />,
	loader: rootLoader,
	children: [
		{
			path: ":sessionNumber",
			element: <ReportsNavLayout />,
			loader: sessionsLoader,
			children: [
				{
					index: true,
					element: null,
				},
				{
					path: ":chart",
					element: <ReportsChart />,
				},
			],
		},
	],
};

export default route;
