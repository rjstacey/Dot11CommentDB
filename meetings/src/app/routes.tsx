import { RouteObject, LoaderFunction } from "react-router";

import { store } from "../store";
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
import { oauthRedirectLoader } from "./oauthRedirectLoader";
import AppLayout from "./layout";
import ErrorPage from "./errorPage";
import RootMain from "./root";
import Fallback from "./fallback";
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

export const routes: RouteObject[] = [
	{
		path: "/",
		element: <AppLayout />,
		errorElement: <ErrorPage />,
		hydrateFallbackElement: <Fallback />,
		loader: rootLoader,
		children: [
			{
				index: true,
				element: <RootMain />,
			},
			{
				// Oauth2 completion will dump us here; redirect to the current group account
				path: "accounts",
				loader: oauthRedirectLoader,
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
					{
						path: "accounts",
						...accountsRoute,
					},
					{
						path: "sessions",
						...sessionsRoute,
					},
					{
						path: "meetings",
						...meetingsRoute,
					},
					{
						path: "webexMeetings",
						...webexMeetingsRoute,
					},
					{
						path: "imatBreakouts",
						...imatBreakoutsRoute,
					},
					{
						path: "imatMeetings",
						...imatMeetingsRoute,
					},
					{
						path: "imatAttendance",
						...imatAttendanceRoute,
					},
					{
						path: "calendar",
						...calendarRoute,
					},
					{
						path: "ieee802World",
						...ieee802WorldRoute,
					},
					{
						path: "reports",
						...reportsRoute,
					},
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
