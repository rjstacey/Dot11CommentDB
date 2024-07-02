import {
	useRouteError,
	Outlet,
	RouteObject,
	LoaderFunction,
	Link,
} from "react-router-dom";

import { store } from "../store";
import { loadGroups } from "../store/groups";
import { setUser } from "../store/user";

import {
	ErrorModal,
	ConfirmModal,
	getUser,
	fetcher,
	User,
	loginAndReturn,
} from "dot11-components";
import Header from "./Header";
import Root from "./root";
import Tools from "./tools";
import Privacy from "./privacy";

import styles from "./app.module.css";

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
 * Top level components
 */
function Layout() {
	return (
		<>
			<Header />
			<main className={styles.main}>
				<Outlet />
			</main>
			<footer>
				<Link to="privacy-policy">Privacy policy</Link>
			</footer>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

function ErrorPage() {
	const error: any = useRouteError();
	console.error(error);

	return (
		<div id="error-page">
			<h1>Oops!</h1>
			<p>Sorry, an unexpected error has occurred.</p>
			<p>
				<i>{error.statusText || error.message}</i>
			</p>
		</div>
	);
}

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
