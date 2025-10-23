import type { RouteObject, LoaderFunction } from "react-router";
import { fetcher, getUserLocalStorage, loginAndReturn } from "@common";
import { store, persistReady, resetStore, setUser, selectUser } from "@/store";
import { loadGroups } from "@/store/groups";

import Main from "./main";
import ErrorPage from "./errorPage";
import Tools from "./tools";
import AppLayout from "./layout";
import Privacy from "./privacy";

/*
 * Routing loader functions
 */
const rootLoader: LoaderFunction = async () => {
	await persistReady;

	const { dispatch, getState } = store;
	const user = await getUserLocalStorage().catch(loginAndReturn);
	if (!user) throw new Error("Unable to get user");
	fetcher.setToken(user.Token); // Prime fetcher with authorization token

	const storeUser = selectUser(getState());
	if (storeUser.SAPIN !== user.SAPIN) dispatch(resetStore());
	dispatch(setUser(user)); // Make sure we have the latest user info

	await dispatch(loadGroups());
	return null;
};

/*
 * Routes
 */
export type AppRoute = RouteObject & {
	minAccess?: number;
	menuLabel?: string;
};

export const routes: AppRoute[] = [
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

export default routes;
