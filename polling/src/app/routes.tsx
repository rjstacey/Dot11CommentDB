import type { RouteObject } from "react-router";

import { AppLayout } from "./layout";
import { AppErrorPage } from "./errorPage";
import adminRoutes from "./admin/routes";
import PollUser from "./user";

import {
	rootLoader,
	groupLoader,
	groupIndexLoader,
	subgroupLoader,
	subgroupIndexLoader,
} from "./loaders";
import { installLoaderWrapper } from "./initialLoad";

/*
 * Routes
 */
export const routes: RouteObject[] = [
	{
		path: "/",
		element: <AppLayout />,
		hydrateFallbackElement: <span>Fallback...</span>,
		errorElement: <AppErrorPage />,
		loader: rootLoader,
		children: [
			{
				index: true,
				loader: groupIndexLoader,
				element: null,
			},
			{
				path: ":groupName",
				loader: groupLoader,
				element: null,
				hydrateFallbackElement: <span>Loading...</span>,
				children: [
					{
						index: true,
						loader: subgroupIndexLoader,
						element: null,
					},
					{
						path: ":subgroupName",
						loader: subgroupLoader,
						children: [
							{
								index: true,
								element: <PollUser />,
							},
							{
								path: "admin",
								...adminRoutes,
							},
						],
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
