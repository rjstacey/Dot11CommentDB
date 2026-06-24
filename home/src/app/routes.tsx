import type { RouteObject, LoaderFunction } from "react-router";
import { store } from "@/store";
import { loadGroups } from "@/store/groups";

import Main from "./main";
import ErrorPage from "./errorPage";
import Tools from "./tools";
import AppLayout from "./layout";
import Privacy from "./privacy";
import { installLoaderWrapper } from "./initialLoad";

/*
 * Routing loader functions
 */
const rootLoader: LoaderFunction = async () => {
	await store.dispatch(loadGroups());
};

/*
 * Routes
 */
const routes: RouteObject[] = [
	{
		path: "/",
		Component: AppLayout,
		errorElement: <ErrorPage />,
		loader: rootLoader,
		children: [
			{
				path: "privacy-policy",
				element: <Privacy />,
			},
			{
				path: ":groupName",
				Component: Main,
				errorElement: <ErrorPage />,
				children: [
					{
						index: true,
						Component: Tools,
					},
				],
			},
			{
				index: true,
				Component: Main,
			},
		],
	},
];

installLoaderWrapper(routes);

export default routes;
