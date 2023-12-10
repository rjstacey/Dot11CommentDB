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
import { selectWorkingGroupByName, loadGroups } from "../store/groups";
import { loadCalendarAccounts } from "../store/calendarAccounts";
import { loadWebexAccounts, selectWebexAccountsGroupName } from "../store/webexAccounts";
import { loadTimeZones } from "../store/timeZones";
import { loadBreakouts, clearBreakouts } from "../store/imatBreakouts";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadImatMeetingAttendance } from "../store/imatMeetingAttendance";

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

const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(loadTimeZones());
	dispatch(loadGroups());
	return null;
};

const groupLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.meetings || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			dispatch(loadGroups(params.groupName!));
			dispatch(loadCalendarAccounts(params.groupName!));
			dispatch(loadWebexAccounts(params.groupName!));
		}
	}
	return null;
};

const imatBreakoutsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.meetings || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			const meetingNumber = Number(params.meetingNumber);
			if (meetingNumber) dispatch(loadBreakouts(meetingNumber));
			else dispatch(clearBreakouts());
		}
	}
	return null;
};

const imatMeetingsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.meetings || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			dispatch(loadImatMeetings());
		}
	}
	return null;
};

const imatMeetingAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.meetings || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			const meetingNumber = Number(params.meetingNumber);
			dispatch(loadImatMeetingAttendance(meetingNumber));
		}
	}
	return null;
};

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
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Meetings",
		path: "meetings",
		element: <Meetings />,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Webex",
		path: "webexMeetings",
		element: <WebexMeetings />,
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
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Reports",
		path: "reports",
		element: <Reports />,
		minAccess: AccessLevel.ro,
	},
];

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
		selectWorkingGroupByName(state, groupName || "")
	);
	const access = group?.permissions.meetings || AccessLevel.none;

	if (!group)
		return <span>Invalid group: {groupName}</span>

	if (access < minAccess)
		return <span>You do not have permission to view this data</span>;

	return <>{children}</>;
}

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

function Layout() {
	return (
		<>
			<Header />
			<main
				className={styles.main}
			>
				<Outlet />
			</main>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

function Root() {
	return (
		<div
			className={styles.root}
		>
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
	const path = groupName? `/${groupName}/accounts`: '/'
	return <Navigate to={path} />
}

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
					{ index: true, element: <GateComponent minAccess={AccessLevel.none}><Root /></GateComponent>},
					{ path: "*", element: <GateComponent minAccess={AccessLevel.none}><span>Not found</span></GateComponent>}
				],
			},
			{
				index: true,
				element: <Root />,
			}
		],
	},
	{
		path: "/accounts",
		element: <NavigateToGroupAccounts />
	},
	{
		path: "/*",
		element: <span>Not found</span>
	}
];

export default routes;
