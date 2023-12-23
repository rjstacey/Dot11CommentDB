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
import { loadSessions } from "../store/sessions";
import { loadMeetings } from "../store/meetings";
import { loadWebexMeetings } from "../store/webexMeetings";
import { loadBreakouts, clearBreakouts } from "../store/imatBreakouts";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadImatMeetingAttendance } from "../store/imatMeetingAttendance";
import { loadBreakoutAttendance } from "../store/imatBreakoutAttendance";
import { load802WorldSchedule } from "../store/ieee802World";

import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";
import WorkingGroupSelector from "./WorkingGroupSelector";
import Accounts from "../accounts/Accounts";
import Sessions from "../sessions/Sessions";
import Meetings from "../meetings/Meetings";
import WebexMeetings from "../webexMeetings/WebexMeetings";
import ImatBreakouts from "../imat/ImatBreakouts";
import ImatMeetings from "../imat/ImatMeetings";
import ImatMeetingAttendance from "../imat/ImatMeetingAttendance";
import ImatBreakoutAttendance from "../imat/ImatBreakoutAttendance";
import Calendar from "../calendar/Calendar";
import Ieee802World from "../ieee802World/Ieee802World";
import Reports from "../reports/Reports";

import styles from "./app.module.css";


/*
 * Router loader functions
 */
const rootLoader: LoaderFunction = async () => {
	console.log("root loader")
	const { dispatch } = store;
	dispatch(loadTimeZones());
	await dispatch(loadGroups());
	return null;
};

const groupLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
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
	}
	return null;
};

const sessionsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadSessions(groupName));
	}
	return null;
};

const meetingsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadSessions(groupName));
		dispatch(loadMeetings(groupName));
	}
	return null;
};

const webexMeetingsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadSessions(groupName));
		dispatch(loadWebexMeetings(groupName));
	}
	return null;
};

const imatBreakoutsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	if (groupName) {
		dispatch(loadImatMeetings(groupName));
		dispatch(
			meetingNumber
				? loadBreakouts(groupName, meetingNumber)
				: clearBreakouts()
		);
	}
	return null;
};

const imatMeetingsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadImatMeetings(groupName));
	}
	return null;
};

const imatMeetingAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	if (groupName && meetingNumber) {
		dispatch(loadImatMeetingAttendance(groupName, meetingNumber));
	}
	return null;
};

const imatBreakoutAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	const breakoutNumber = Number(params.breakoutNumber);
	if (groupName && meetingNumber && breakoutNumber) {
		dispatch(
			loadBreakoutAttendance(groupName, meetingNumber, breakoutNumber)
		);
	}
	return null;
};

const ieee802WorldLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	dispatch(load802WorldSchedule());
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
		element: <Accounts />,
		minAccess: AccessLevel.admin,
	},
	{
		menuLabel: "Sessions",
		path: "sessions",
		element: <Sessions />,
		loader: sessionsLoader,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Meetings",
		path: "meetings",
		element: <Meetings />,
		loader: meetingsLoader,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Webex",
		path: "webexMeetings",
		element: <WebexMeetings />,
		loader: webexMeetingsLoader,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "IMAT breakouts",
		path: "imatBreakouts/:meetingNumber?",
		element: <ImatBreakouts />,
		loader: imatBreakoutsLoader,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "IMAT sessions",
		path: "imatMeetings",
		element: <ImatMeetings />,
		loader: imatMeetingsLoader,
		minAccess: AccessLevel.ro,
	},
	{
		path: "imatAttendance/:meetingNumber",
		element: <ImatMeetingAttendance />,
		loader: imatMeetingAttendanceLoader,
		minAccess: AccessLevel.ro,
	},
	{
		path: "imatAttendance/:meetingNumber/:breakoutNumber",
		element: <ImatBreakoutAttendance />,
		loader: imatBreakoutAttendanceLoader,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Calendar",
		path: "calendar",
		element: <Calendar />,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "802 World",
		path: "ieee802World",
		element: <Ieee802World />,
		loader: ieee802WorldLoader,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Reports",
		path: "reports",
		element: <Reports />,
		loader: sessionsLoader,
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
