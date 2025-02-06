import { RouteObject, LoaderFunction } from "react-router";
import { getUser, fetcher, User, loginAndReturn } from "dot11-components";
import { store } from "@/store";
import { loadGroups } from "@/store/groups";
import { setUser } from "@/store/user";

import Root from "./root";
import ErrorPage from "./errorPage";
import Tools from "./tools";
import Layout from "./layout";
import Privacy from "./privacy";

/*
 * Routing loader functions
 */
const rootLoader: LoaderFunction = async () => {
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

const routes: AppRoute[] = [
	{
		path: "/",
		element: <Layout />,
		errorElement: <ErrorPage />,
		loader: rootLoader,
		children: [
			{
				path: "privacy-policy",
				element: <Privacy />,
			},
			{
				path: ":groupName",
				errorElement: <ErrorPage />,
				children: [
					{
						index: true,
						element: (
							<Root>
								<Tools />
							</Root>
						),
					},
				],
			},
			{
				index: true,
				element: <Root />,
			},
		],
	},
];

export default routes;
