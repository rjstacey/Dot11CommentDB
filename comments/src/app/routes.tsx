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
import { selectIsOnline } from "../store/offline";
import { selectWorkingGroupByName, loadGroups } from "../store/groups";
import { loadMembers } from "../store/members";
import { loadEpolls } from "../store/epolls";
import {
	loadBallots,
	selectBallotByBallotID,
	setCurrentBallot_id,
} from "../store/ballots";
import { loadVoters } from "../store/voters";
import { loadResults } from "../store/results";
import { loadComments, selectCommentsBallot_id } from "../store/comments";

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

/*
 * Routing loaders
 */
const rootLoader: LoaderFunction = async () => {
	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		await dispatch(loadGroups());
	}
	return null;
};

const groupLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		const { groupName } = params;
		if (groupName) {
			dispatch(loadGroups(groupName));
			dispatch(loadMembers(groupName));
		}
	}
	return null;
};

const ballotsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		const { groupName } = params;
		if (groupName) {
			dispatch(loadBallots(groupName));
		}
	}
	return null;
};

const epollsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		const { groupName } = params;
		if (groupName) {
			dispatch(loadBallots(groupName));
			dispatch(loadEpolls(groupName));
		}
	}
	return null;
};

const ballotVotersLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		const { groupName, ballotId } = params;
		if (groupName) {
			const p = dispatch(loadBallots(groupName));
			dispatch(loadMembers(groupName));
			if (ballotId) {
				let ballot = selectBallotByBallotID(getState(), ballotId);
				if (!ballot) {
					await p; // see if we get it with a ballots refresh
					ballot = selectBallotByBallotID(getState(), ballotId);
				}
				if (ballot) {
					dispatch(loadVoters(ballot.id));
				}
			}
		}
	}
	return null;
};

const resultsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		const { groupName, ballotId } = params;
		if (groupName) {
			const p = dispatch(loadBallots(groupName));
			if (ballotId) {
				let ballot = selectBallotByBallotID(getState(), ballotId);
				if (!ballot) {
					await p; // see if we get it with a ballots refresh
					ballot = selectBallotByBallotID(getState(), ballotId);
				}
				if (ballot) {
					dispatch(loadResults(ballot.id));
				}
			}
		}
	}
	return null;
};

const commentsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		const { groupName, ballotId } = params;
		if (groupName) {
			const p = dispatch(loadBallots(groupName));
			if (ballotId) {
				let ballot = selectBallotByBallotID(getState(), ballotId);
				if (!ballot) {
					await p; // see if we get it with a ballots refresh
					ballot = selectBallotByBallotID(getState(), ballotId);
				}
				if (ballot) {
					dispatch(setCurrentBallot_id(ballot.id));
					if (ballot.id !== selectCommentsBallot_id(getState()))
						dispatch(loadComments(ballot.id));
				}
			}
		}
	}
	return null;
};

/*
 * Layout components
 */

/** A component that only renders its children if the user has a defined minimum access */
function GateComponent({
	scope = "",
	minAccess,
	children,
}: {
	scope?: string;
	minAccess: number;
	children: React.ReactNode;
}) {
	const { groupName } = useParams();
	const group = useAppSelector((state) =>
		selectWorkingGroupByName(state, groupName || "")
	);
	const access = group?.permissions[scope] || AccessLevel.none;

	if (!group) return <span>Invalid group: {groupName}</span>;

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

/** Rework the routes so that the elements are gated for the min access level */
const groupRoutes = groupRoutes_ungated.map((r) => {
	if (typeof r.minAccess === "number")
		return {
			...r,
			element: (
				<GateComponent
					scope={r.scope}
					minAccess={r.minAccess}
					children={r.element}
				/>
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
