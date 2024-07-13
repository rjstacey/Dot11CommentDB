import * as React from "react";
import {
	useParams,
	useRouteError,
	Outlet,
	RouteObject,
	LoaderFunction,
} from "react-router-dom";

import { store } from "../store";
import { useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import {
	selectWorkingGroupByName,
	loadGroups,
	selectGroupsState,
	setWorkingGroupId,
	GroupType,
} from "../store/groups";
import { loadMembers } from "../store/members";
import { loadUsers } from "../store/users";
import { loadOfficers } from "../store/officers";
import { loadCommittees } from "../store/imatCommittees";
import { loadTimeZones } from "../store/timeZones";
import { loadAttendances } from "../store/sessionParticipation";
import { loadBallotParticipation } from "../store/ballotParticipation";
import { loadEmailTemplates } from "../store/email";
import { loadAffiliationMap } from "../store/affiliationMap";
import { loadSessions } from "../store/sessions";

import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";
import WorkingGroupSelector from "./WorkingGroupSelector";
import Members from "../members/Members";
import Groups from "../groups/Groups";
import SessionParticipation from "../sessionParticipation/SessionParticipation";
import BallotParticipation from "../ballotParticipation/BallotParticipation";
import SessionAttendance from "../sessionAttendance/SessionAttendance";
import Notification from "../notification/Notification";
import AffiliationMap from "../affiliationMap/AffiliationMap";
import Reports, { reportRoutes } from "../reports/Reports";

import styles from "./app.module.css";

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

const groupsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const { valid } = selectGroupsState(getState());
		if (!valid) {
			await dispatch(loadGroups());
		}
		const group = selectWorkingGroupByName(getState(), groupName);
		dispatch(setWorkingGroupId(group?.id || null));
		dispatch(loadCommittees(groupName));
	}
	return null;
};

const membersLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		// We have already loaded the members, but we need participation
		dispatch(loadAttendances(groupName));
		dispatch(loadBallotParticipation(groupName));
		dispatch(loadAffiliationMap(groupName));
	}
	return null;
};

const sessionParticipationLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadAttendances(groupName));
	}
	return null;
};

const ballotParticipationLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadBallotParticipation(groupName));
	}
	return null;
};

const sessionAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadSessions(groupName));
	}
	return null;
};

const notificationsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadMembers(groupName));
		dispatch(loadEmailTemplates(groupName));
	}
	return null;
};

/*
 * Layout components
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

	const access = group.permissions.members || AccessLevel.none;
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

/*
 * Routes
 */
export type AppRoute = RouteObject & {
	minAccess?: number;
	menuLabel?: string;
	groupTypes?: GroupType[];
};

const groupRoutes_ungated: AppRoute[] = [
	{
		menuLabel: "Members",
		path: "members",
		element: <Members />,
		loader: membersLoader,
		minAccess: AccessLevel.admin,
		groupTypes: ["r", "c", "wg"],
	},
	{
		menuLabel: "Groups",
		path: "groups",
		element: <Groups />,
		loader: groupsLoader,
		minAccess: AccessLevel.ro,
		groupTypes: ["r", "c", "wg"],
	},
	{
		menuLabel: "Session participation",
		path: "sessionParticipation",
		element: <SessionParticipation />,
		loader: sessionParticipationLoader,
		minAccess: AccessLevel.admin,
		groupTypes: ["c", "wg"],
	},
	{
		menuLabel: "Ballot pariticipation",
		path: "ballotParticipation",
		element: <BallotParticipation />,
		loader: ballotParticipationLoader,
		minAccess: AccessLevel.admin,
		groupTypes: ["c", "wg"],
	},
	{
		menuLabel: "Session attendance",
		path: "sessionAttendance",
		element: <SessionAttendance />,
		loader: sessionAttendanceLoader,
		minAccess: AccessLevel.admin,
		groupTypes: ["c", "wg"],
	},
	{
		menuLabel: "Notification",
		path: "notification",
		element: <Notification />,
		loader: notificationsLoader,
		minAccess: AccessLevel.admin,
		groupTypes: ["c", "wg"],
	},
	{
		menuLabel: "Reports",
		path: "reports",
		element: <Reports />,
		loader: membersLoader,
		minAccess: AccessLevel.ro,
		groupTypes: ["c", "wg"],
		children: reportRoutes,
	},
	{
		path: "affiliationMap",
		element: <AffiliationMap />,
		loader: membersLoader,
		minAccess: AccessLevel.ro,
		groupTypes: ["c", "wg"],
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
		path: "/*",
		element: <span>Not found</span>,
	},
];

export default routes;
