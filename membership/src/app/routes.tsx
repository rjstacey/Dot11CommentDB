import { RouteObject, LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { AccessLevel } from "../store/user";
import { loadGroups, GroupType } from "../store/groups";
import { loadMembers } from "../store/members";
import { loadUsers } from "../store/users";
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

export type MenuItem = {
	path: string;
	label: string;
	minAccess: number;
	groupTypes?: GroupType[];
};

export const menu: MenuItem[] = [
	{
		path: "/:groupName/members",
		label: "Members",
		minAccess: AccessLevel.ro,
		groupTypes: ["r", "c", "wg"],
	},
	{
		path: "/:groupName/groups",
		label: "Groups",
		minAccess: AccessLevel.ro,
		groupTypes: ["r", "c", "wg"],
	},
	{
		path: "/:groupName/sessionParticipation",
		label: "Session participation",
		minAccess: AccessLevel.admin,
		groupTypes: ["c", "wg"],
	},
	{
		path: "/:groupName/ballotParticipation",
		label: "Ballot pariticipation",
		minAccess: AccessLevel.admin,
		groupTypes: ["c", "wg"],
	},
	{
		path: "/:groupName/sessionAttendance/:sessionNumber?",
		label: "Session attendance",
		minAccess: AccessLevel.admin,
		groupTypes: ["c", "wg"],
	},
	{
		path: "/:groupName/notification",
		label: "Notification",
		minAccess: AccessLevel.admin,
		groupTypes: ["c", "wg"],
	},
	{
		path: "/:groupName/affiliationMap",
		label: "Affiliation Map",
		minAccess: AccessLevel.ro,
		groupTypes: ["c", "wg"],
	},
];

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
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadGroups(groupName));
		dispatch(loadMembers(groupName));
		dispatch(loadUsers(groupName));
		dispatch(loadOfficers(groupName));
	}
	return null;
};

/*
 * Routes
 */
const groupRoutes: RouteObject[] = [
	{
		path: "members",
		...membersRoute,
	},
	{
		path: "groups",
		...groupsRoute,
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
