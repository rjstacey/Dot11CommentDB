import { RouteObject, LoaderFunction } from "react-router";
import { getUser, fetcher, User, loginAndReturn } from "@common";
import { store, persistReady } from "@/store";
import { loadGroups } from "@/store/groups";
import { setUser } from "@/store/user";

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

	const { dispatch } = store;
	let user: User;
	try {
		user = await getUser();
	} catch (error) {
		console.log(error);
		return null;
	}
	fetcher.setAuth(user.Token, loginAndReturn);
	dispatch(setUser(user));
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
