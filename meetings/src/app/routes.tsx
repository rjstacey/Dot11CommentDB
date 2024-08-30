import * as React from "react";
import {
	useParams,
	useRouteError,
	Outlet,
	Navigate,
	RouteObject,
	LoaderFunction,
} from "react-router-dom";

import { store } from "../store";
import { useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import {
	selectGroupsState,
	selectWorkingGroupByName,
	setWorkingGroupId,
	loadGroups,
} from "../store/groups";
import { loadCalendarAccounts } from "../store/calendarAccounts";
import {
	loadWebexAccounts,
	selectWebexAccountsGroupName,
} from "../store/webexAccounts";
import { loadMembers } from "../store/members";
import { loadOfficers } from "../store/officers";
import { loadTimeZones } from "../store/timeZones";

import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";
import WorkingGroupSelector from "./WorkingGroupSelector";
import accountsRoute from "../accounts/route";
import sessionsRoute from "../sessions/route";
import reportsRoute from "../reports/route";
import meetingsRoute from "../meetings/route";
import webexMeetingsRoute from "../webexMeetings/route";
import imatBreakoutsRoute from "../imatBreakouts/route";
import imatMeetingsRoute from "../imatMeetings/route";
import imatAttendanceRoute from "../imatAttendance/route";
import calendarRoute from "../calendar/route";
import ieee802WorldRoute from "../ieee802World/route";

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
	// Make sure we have the working groups loaded so that we can set the working group ID
	const { valid } = selectGroupsState(getState());
	if (!valid) {
		await dispatch(loadGroups());
	}
	const group = selectWorkingGroupByName(getState(), groupName);
	dispatch(setWorkingGroupId(group?.id || null));
	dispatch(loadGroups(groupName));
	dispatch(loadCalendarAccounts(groupName));
	dispatch(loadWebexAccounts(groupName));
	dispatch(loadMembers(groupName));
	dispatch(loadOfficers(groupName));
	return null;
};

/*
 * Top level components
 */

/** A component that only renders its children if the user has a defined minimum access */
function GateComponent({
	minAccess,
	children,
}: {
	minAccess: number;
	children: React.ReactNode;
}) {
	const { groupName } = useParams();
	const group = useAppSelector((state) =>
		groupName ? selectWorkingGroupByName(state, groupName) : undefined
	);

	if (!group) return <span>Invalid group: {groupName}</span>;

	const access = group.permissions.meetings || AccessLevel.none;
	if (access < minAccess)
		return <span>You do not have permission to view this data</span>;

	return <>{children}</>;
}

function Layout() {
	return (
		<>
			<Header />
			<main className={styles.main}>
				<Outlet />
			</main>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

function Root() {
	return (
		<div className={styles.root}>
			<div className="intro">Working group/Committee</div>
			<WorkingGroupSelector />
		</div>
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

const groupRoutes_ungated: AppRoute[] = [
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

/** Rework the routes so that the elements are gated for the min access level */
const groupRoutes = groupRoutes_ungated.map((r) => {
	if (typeof r.minAccess === "number")
		return {
			...r,
			element: (
				<GateComponent minAccess={r.minAccess} children={r.element} />
			),
		};
	return r;
});

const routes: AppRoute[] = [
	{
		path: "/",
		element: <Layout />,
		errorElement: <ErrorPage />,
		loader: rootLoader,
		children: [
			{
				path: ":groupName",
				loader: groupLoader,
				errorElement: <ErrorPage />,
				children: [
					...groupRoutes,
					{
						index: true,
						element: (
							<GateComponent minAccess={AccessLevel.none}>
								<Root />
							</GateComponent>
						),
					},
					{
						path: "*",
						element: (
							<GateComponent minAccess={AccessLevel.none}>
								<span>Not found</span>
							</GateComponent>
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
	{
		// Oauth2 completion will dump us here; navigate to the current group account
		path: "/accounts",
		element: <NavigateToGroupAccounts />,
	},
	{
		path: "/*",
		element: <span>Not found</span>,
	},
];

export default routes;
