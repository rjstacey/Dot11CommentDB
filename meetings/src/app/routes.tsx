import { RouteObject, LoaderFunction } from "react-router";

import { store } from "../store";
import { AccessLevel } from "../store/user";
import {
	selectTopLevelGroupByName,
	setTopLevelGroupId,
	loadGroups,
} from "@/store/groups";
import { loadCalendarAccounts } from "@/store/calendarAccounts";
import { loadWebexAccounts } from "@/store/webexAccounts";
import { loadMembers } from "@/store/members";
import { loadOfficers } from "@/store/officers";

import { rootLoader } from "./rootLoader";
import AppLayout from "./layout";
import ErrorPage from "./errorPage";
import RootMain from "./root";
import { NavigateToGroupAccounts } from "./NavigateToGroupAccounts";
import accountsRoute from "./accounts/route";
import sessionsRoute from "./sessions/route";
import reportsRoute from "./reports/route";
import meetingsRoute from "./meetings/route";
import webexMeetingsRoute from "./webexMeetings/route";
import imatBreakoutsRoute from "./imatBreakouts/route";
import imatMeetingsRoute from "./imatMeetings/route";
import imatAttendanceRoute from "./imatAttendance/route";
import calendarRoute from "./calendar/route";
import ieee802WorldRoute from "./ieee802World/route";

const groupLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	dispatch(setTopLevelGroupId(group?.id || null));
	await dispatch(loadGroups(groupName));
	dispatch(loadCalendarAccounts(groupName));
	dispatch(loadWebexAccounts(groupName));
	dispatch(loadMembers(groupName));
	dispatch(loadOfficers(groupName));
	return null;
};

/*
 * Routes
 */
export type AppRoute = RouteObject & {
	minAccess?: number;
	menuLabel?: string;
};

const groupRoutes: AppRoute[] = [
	{
		menuLabel: "Accounts",
		path: "accounts",
		...accountsRoute,
		minAccess: AccessLevel.admin,
	},
	{
		menuLabel: "Sessions",
		path: "sessions",
		...sessionsRoute,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Meetings",
		path: "meetings",
		...meetingsRoute,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Webex",
		path: "webexMeetings",
		...webexMeetingsRoute,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "IMAT breakouts",
		path: "imatBreakouts",
		...imatBreakoutsRoute,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "IMAT sessions",
		path: "imatMeetings",
		...imatMeetingsRoute,
		minAccess: AccessLevel.ro,
	},
	{
		path: "imatAttendance",
		...imatAttendanceRoute,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Calendar",
		path: "calendar",
		...calendarRoute,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "802 World",
		path: "ieee802World",
		...ieee802WorldRoute,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Reports",
		path: "reports",
		...reportsRoute,
		minAccess: AccessLevel.ro,
	},
];

export const routes: AppRoute[] = [
	{
		path: "/",
		element: <AppLayout />,
		errorElement: <ErrorPage />,
		hydrateFallbackElement: <span>Fallback</span>,
		loader: rootLoader,
		children: [
			{
				index: true,
				element: <RootMain />,
			},
			{
				// Oauth2 completion will dump us here; navigate to the current group account
				path: "accounts",
				element: <NavigateToGroupAccounts />,
			},
			{
				path: ":groupName",
				loader: groupLoader,
				errorElement: <ErrorPage />,
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
