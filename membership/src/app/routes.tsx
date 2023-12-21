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
} from "../store/groups";
import { loadMembers } from "../store/members";
import { loadOfficers } from "../store/officers";
import { loadCommittees } from "../store/imatCommittees";
import { loadTimeZones } from "../store/timeZones";
import { loadAttendances } from "../store/sessionParticipation";
import { loadBallotParticipation } from "../store/ballotParticipation";
import { loadEmailTemplates } from "../store/email";
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
import Reports from "../reports/Reports";

import styles from "./app.module.css";

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
		dispatch(loadOfficers(groupName));
	}
	return null;
};

const groupsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadCommittees(groupName));
	}
	return null;
}

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

export type AppRoute = RouteObject & {
	minAccess?: number;
	menuLabel?: string;
};

const groupRoutes_ungated: AppRoute[] = [
	{
		menuLabel: "Members",
		path: "members",
		element: <Members />,
		minAccess: AccessLevel.admin,
	},
	{
		menuLabel: "Groups",
		path: "groups",
		element: <Groups />,
		loader: groupsLoader,
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Session participation",
		path: "sessionParticipation",
		element: <SessionParticipation />,
		loader: sessionParticipationLoader,
		minAccess: AccessLevel.admin,
	},
	{
		menuLabel: "Ballot pariticipation",
		path: "ballotParticipation",
		element: <BallotParticipation />,
		loader: ballotParticipationLoader,
		minAccess: AccessLevel.admin,
	},
	{
		menuLabel: "Session attendance",
		path: "sessionAttendance",
		element: <SessionAttendance />,
		loader: sessionAttendanceLoader,
		minAccess: AccessLevel.admin,
	},
	{
		menuLabel: "Notification",
		path: "notification",
		element: <Notification />,
		loader: notificationsLoader,
		minAccess: AccessLevel.admin,
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
		groupName ? selectWorkingGroupByName(state, groupName) : undefined
	);

	if (!group) return <span>Invalid group: {groupName}</span>;

	const access = group.permissions.members || AccessLevel.none;
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
