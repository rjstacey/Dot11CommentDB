import type { RouteObject } from "react-router";

import Main from "./main";
import ErrorPage from "./errorPage";
import Tools from "./tools";
import AppLayout from "./layout";
import Privacy from "./privacy";
import Terms from "./terms";
import loader from "./loader";

/*
 * Routes
 */
const routes: RouteObject[] = [
	{
		path: "/",
		Component: AppLayout,
		errorElement: <ErrorPage />,
		hydrateFallbackElement: <div>Loading...</div>,
		loader,
		children: [
			{
				path: "privacy",
				element: <Privacy />,
			},
			{
				path: "terms",
				element: <Terms />,
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
