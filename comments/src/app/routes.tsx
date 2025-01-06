import { RouteObject, LoaderFunction } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import { selectIsOnline } from "@/store/offline";
import { loadGroups, selectTopLevelGroupByName } from "@/store/groups";
import { loadMembers } from "@/store/members";
import { loadBallots } from "@/store/ballots";

import AppLayout from "./layout";
import AppErrorPage from "./errorPage";
import RootMain from "./rootMain";
import ballotsRoute from "./ballots/route";
import epollsRoute from "./epolls/route";
import votersRoute from "./voters/route";
import resultsRoute from "./results/route";
import commentsRoute from "./comments/route";
import reportsRoute from "./reports/route";

export type MenuItem = {
	path: string;
	label: string;
	scope: string;
	minAccess: number;
};

export const menu: MenuItem[] = [
	{
		path: "/:groupName/ballots",
		label: "Ballots",
		scope: "ballots",
		minAccess: AccessLevel.ro,
	},
	{
		path: "/:groupName/voters/:ballotId?",
		label: "Voters",
		scope: "ballots",
		minAccess: AccessLevel.ro,
	},
	{
		path: "/:groupName/results/:ballotId?",
		label: "Results",
		scope: "results",
		minAccess: AccessLevel.ro,
	},
	{
		path: "/:groupName/comments/:ballotId?",
		label: "Comments",
		scope: "comments",
		minAccess: AccessLevel.ro,
	},
	{
		path: "/:groupName/reports/:ballotId?",
		label: "Reports",
		scope: "comments",
		minAccess: AccessLevel.ro,
	},
];

/*
 * Route loaders
 */
const rootLoader: LoaderFunction = async () => {
	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) await dispatch(loadGroups());
	return null;
};

const groupLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	if (selectIsOnline(getState())) await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);

	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.ballots || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	if (selectIsOnline(getState())) {
		dispatch(loadGroups(groupName));
		dispatch(loadMembers(groupName));
		dispatch(loadBallots(groupName));
	}
	return null;
};

/*
 * Routes
 */
export type AppRoute = RouteObject & {
	scope?: string;
	minAccess?: number;
	menuLabel?: string;
	children?: AppRoute[];
};

const groupRoutes: RouteObject[] = [
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
];

const routes: RouteObject[] = [
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
					...groupRoutes,
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

export default routes;
