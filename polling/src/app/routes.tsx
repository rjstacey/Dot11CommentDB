import { lazy } from "react";
import type { RouteObject, LoaderFunction } from "react-router";

import { store } from "@/store";
import {
	loadGroups,
	selectSubgroupByName,
	setSelectedGroupId,
} from "@/store/groups";

import AppLayout from "./layout";
import ErrorPage from "./errorPage";
import Polling from "./polling";
//import PollAdmin from "./admin";
const PollAdmin = lazy(() => import("./admin"));
//import PollUser from "./user";
const PollUser = lazy(() => import("./user"));

import { rootLoader } from "./rootLoader";
import { groupLoader, groupIndexLoader } from "./groupLoader";

/*
 * Routing loaders
 */

const subgroupIndexLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	store.dispatch(setSelectedGroupId(null));
	return null;
};

const subgroupLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName, subgroupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!subgroupName) throw new Error("Route error: subgroupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	await dispatch(loadGroups(groupName));

	const subgroup = selectSubgroupByName(getState(), subgroupName);
	dispatch(setSelectedGroupId(subgroup?.id || null));

	return null;
};

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

export default routes;
