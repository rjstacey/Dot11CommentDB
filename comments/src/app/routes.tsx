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
import { selectWorkingGroupByName, loadGroups } from "../store/groups";
import { loadMembers } from "../store/members";

import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";
import WorkingGroupSelector from "./WorkingGroupSelector";
import Ballots from "../ballots/Ballots";
import Epolls from "../ballots/Epolls";
import Voters from "../ballotVoters/Voters";
import Results from "../results/Results";
import Comments from "../comments/Comments";
import Reports from "../reports/Reports";

import styles from "./app.module.css";
import { loadEpolls } from "../store/epolls";
import { loadBallots, selectBallotByBallotID } from "../store/ballots";
import { loadVoters } from "../store/voters";
import { loadResults } from "../store/results";
import { loadComments, selectCommentsBallot_id } from "../store/comments";

const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(loadGroups());
	return null;
};

const groupLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.comments || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			dispatch(loadGroups(groupName));
			dispatch(loadMembers(groupName));
		}
	}
	return null;
};

const ballotsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.ballots || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			dispatch(loadBallots(groupName));
		}
	}
	return null;
}

const epollsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.ballots || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			dispatch(loadBallots(groupName));
			dispatch(loadEpolls(groupName));
		}
	}
	return null;
}

const ballotVotersLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName, ballotId } = params;
	if (groupName && ballotId) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.ballots || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			const ballot = selectBallotByBallotID(getState(), ballotId);
			if (ballot) {
				dispatch(loadVoters(ballot.id));
			}
		}
	}
	return null;
}

const resultsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName, ballotId } = params;
	if (groupName && ballotId) {
		const group = selectWorkingGroupByName(getState(), groupName);
		const access = group?.permissions.results || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			const ballot = selectBallotByBallotID(getState(), ballotId);
			if (ballot) {
				dispatch(loadResults(ballot.id));
			}
		}
	}
	return null;
}

const commentsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const state = getState();
	const { groupName, ballotId } = params;
	if (groupName && ballotId) {
		const group = selectWorkingGroupByName(state, groupName);
		const access = group?.permissions.comments || AccessLevel.none;
		if (access >= AccessLevel.ro) {
			const ballot = selectBallotByBallotID(state, ballotId);
			if (ballot && ballot.id !== selectCommentsBallot_id(state)) {
				dispatch(loadComments(ballot.id));
			}
		}
	}
	return null;
}

export type AppRoute = RouteObject & {
	scope?: string;
	minAccess?: number;
	menuLabel?: string;
};

const groupRoutes_ungated: AppRoute[] = [
	{
		menuLabel: "Ballots",
		path: "ballots",
		element: <Ballots />,
		scope: "ballots",
		loader: ballotsLoader,
		minAccess: AccessLevel.ro,
	},
	{
		path: "epolls",
		element: <Epolls />,
		scope: "ballots",
		loader: epollsLoader,
		minAccess: AccessLevel.admin,
	},
	{
		menuLabel: "Ballot voters",
		path: "voters/:ballotId?",
		element: <Voters />,
		loader: ballotVotersLoader,
		scope: "ballots",
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Results",
		path: "results/:ballotId?",
		element: <Results />,
		loader: resultsLoader,
		scope: "results",
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Comments",
		path: "comments/:ballotId?",
		element: <Comments />,
		loader: commentsLoader,
		scope: "comments",
		minAccess: AccessLevel.ro,
	},
	{
		menuLabel: "Reports",
		path: "reports/:ballotId?",
		element: <Reports />,
		loader: commentsLoader,
		scope: "comments",
		minAccess: AccessLevel.ro,
	},
];

/** A component that only renders its children if the user has a defined minimum access */
function GateComponent({
	scope = "",
	minAccess,
	children,
}: {
	scope?: string,
	minAccess: number;
	children: React.ReactNode;
}) {
	const { groupName } = useParams();
	const group = useAppSelector((state) =>
		selectWorkingGroupByName(state, groupName || "")
	);
	const access = group?.permissions[scope] || AccessLevel.none;

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
				<GateComponent scope={r.scope} minAccess={r.minAccess} children={r.element} />
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
		path: "/*",
		element: <span>Not found</span>
	}
];

export default routes;