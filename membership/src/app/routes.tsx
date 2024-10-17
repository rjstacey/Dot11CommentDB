import { RouteObject, LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { AccessLevel } from "../store/user";
import {
	loadGroups,
	selectTopLevelGroupByName,
	setTopLevelGroupId,
} from "../store/groups";
import { loadMembers } from "../store/members";
import { loadIeeeMembers } from "../store/ieeeMembers";
import { loadOfficers } from "../store/officers";
import { loadTimeZones } from "../store/timeZones";

import AppLayout from "./layout";
import AppErrorPage from "./errorPage";
import RootMain from "./rootMain";

import membersRoute from "../members/route";
import groupsRoute from "../groups/route";
import sessionAttendanceRoute from "../sessionAttendance/routes";
import sessionParticipationRoute from "../sessionParticipation/route";
import ballotParticipationRoute from "../ballotParticipation/route";
import notificationRoute from "../notification/route";
import affiliationMapRoute from "../affiliationMap/route";
import { loadSessions } from "../store/sessions";

/*
 * Routing loaders
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

	// Check permissions
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	const wait: Promise<any>[] = [];
	dispatch(setTopLevelGroupId(group.id));
	wait.push(dispatch(loadGroups(groupName)));
	wait.push(dispatch(loadSessions(groupName)));
	dispatch(loadIeeeMembers());
	dispatch(loadMembers(groupName));
	dispatch(loadOfficers(groupName));
	await Promise.all(wait);

	return null;
};

/*
 * Routes
 */
const groupRoutes: RouteObject[] = [
	{
		path: "groups",
		...groupsRoute,
	},
	{
		path: "members",
		...membersRoute,
	},
	{
		path: "sessionParticipation",
		...sessionParticipationRoute,
	},
	{
		path: "ballotParticipation",
		...ballotParticipationRoute,
	},
	{
		path: "sessionAttendance",
		...sessionAttendanceRoute,
	},
	{
		path: "notification",
		...notificationRoute,
	},
	{
		path: "affiliationMap",
		...affiliationMapRoute,
	},
];

const routes: RouteObject[] = [
	{
		path: "/",
		element: <AppLayout />,
		errorElement: <AppErrorPage />,
		loader: rootLoader,
		children: [
			{
				index: true,
				element: <RootMain />,
			},
			{
				path: "groups",
				...groupsRoute,
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
			{
				index: true,
				element: <RootMain />,
			},
		],
	},
	{
		path: "/*",
		element: <span>Not found</span>,
	},
];

export default routes;
