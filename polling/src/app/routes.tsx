import { lazy } from "react";
import type { RouteObject } from "react-router";

import AppLayout from "./layout";
import ErrorPage from "./errorPage";
import Polling from "./polling";
//import PollAdmin from "./admin";
const PollAdmin = lazy(() => import("./admin"));
//import PollUser from "./user";
const PollUser = lazy(() => import("./user"));

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
		hydrateFallbackElement: <span></span>,
		errorElement: <ErrorPage />,
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
				errorElement: <ErrorPage />,
				children: [
					{
						index: true,
						loader: subgroupIndexLoader,
						element: null,
					},
					{
						path: ":subgroupName",
						loader: subgroupLoader,
						element: <Polling />,
						children: [
							{
								index: true,
								element: <PollUser />,
							},
							{
								path: "admin",
								element: <PollAdmin />,
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
