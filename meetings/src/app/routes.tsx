import { Navigate, RouteObject, LoaderFunction } from "react-router";

import { store } from "../store";
import { useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import {
	selectTopLevelGroupByName,
	setTopLevelGroupId,
	loadGroups,
} from "@/store/groups";
import { loadCalendarAccounts } from "@/store/calendarAccounts";
import {
	loadWebexAccounts,
	selectWebexAccountsGroupName,
} from "@/store/webexAccounts";
import { loadMembers } from "@/store/members";
import { loadOfficers } from "@/store/officers";
import { loadTimeZones } from "@/store/timeZones";

import AppLayout from "./layout";
import ErrorPage from "./errorPage";
import WorkingGroupSelector from "./WorkingGroupSelector";
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

import styles from "./app.module.css";

/*
 * Routing loader functions
 */
const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(loadTimeZones());
	await dispatch(loadGroups());
	return null;
};

const groupLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
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
 * Top level components
 */

function Root() {
	return (
		<div className={styles.root}>
			<div className="intro">Working group/Committee</div>
			<WorkingGroupSelector />
		</div>
	);
}

function NavigateToGroupAccounts() {
	const groupName = useAppSelector(selectWebexAccountsGroupName);
	const path = groupName ? `/${groupName}/accounts` : "/";
	return <Navigate to={path} />;
}

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

const routes: AppRoute[] = [
	{
		path: "/",
		element: <AppLayout />,
		errorElement: <ErrorPage />,
		hydrateFallbackElement: <span>Fallback</span>,
		loader: rootLoader,
		children: [
			{
				index: true,
				element: <Root />,
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
						element: <Root />,
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
