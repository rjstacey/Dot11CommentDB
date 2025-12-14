import { RouteObject } from "react-router";

import AppLayout from "./layout";
import AppErrorPage from "./errorPage";
import RootMain from "./root";
import ballotsRoute from "./ballots/route";
import epollsRoute from "./epolls/route";
import votersRoute from "./voters/route";
import resultsRoute from "./results/route";
import commentsRoute from "./comments/route";
import reportsRoute from "./reports/route";

import { rootLoader } from "./rootLoader";
import { groupLoader } from "./groupLoader";
import { installLoaderWrapper } from "./initialLoad";

export const routes: RouteObject[] = [
	{
		path: "/",
		element: <AppLayout />,
		errorElement: <AppErrorPage />,
		hydrateFallbackElement: <span>Fallback</span>,
		loader: rootLoader,
		children: [
			{
				index: true,
				element: <RootMain />,
			},
			{
				path: ":groupName",
				loader: groupLoader,
				errorElement: <AppErrorPage />,
				children: [
					{
						index: true,
						element: <RootMain />,
					},
					{
						path: "ballots",
						...ballotsRoute,
					},
					{
						path: "epolls",
						...epollsRoute,
					},
					{
						path: "voters",
						...votersRoute,
					},
					{
						path: "results",
						...resultsRoute,
					},
					{
						path: "comments",
						...commentsRoute,
					},
					{
						path: "reports",
						...reportsRoute,
					},
					{
						path: "*",
						element: <span>Not found</span>,
					},
				],
			},
		],
	},
	{
		path: "/*",
		element: <span>Not found</span>,
	},
];

installLoaderWrapper(routes);

export default routes;
