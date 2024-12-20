import { RouteObject, LoaderFunction, useRouteError } from "react-router";
import { store } from "../store";
import { AccessLevel } from "../store/user";
import { selectIsOnline } from "../store/offline";
import {
	loadBallots,
	selectBallotByBallotID,
	setCurrentBallot_id,
} from "../store/ballots";
import { selectGroup } from "../store/groups";
import { clearResults, loadResults } from "../store/results";

import ResultsLayout from "./layout";
import ResultsTable from "./table";

const indexLoader: LoaderFunction = async () => {
	store.dispatch(clearResults());
	return null;
};

const ballotIdLoader: LoaderFunction = async ({ params }) => {
	const { groupName, ballotId } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!ballotId) throw new Error("Route error: ballotId not set");

	const { dispatch, getState } = store;
	const isOnline = selectIsOnline(getState());

	if (isOnline) await dispatch(loadBallots(groupName));

	const ballot = selectBallotByBallotID(getState(), ballotId);
	if (ballot) {
		dispatch(setCurrentBallot_id(ballot.id));

		const group = selectGroup(getState(), ballot.groupId!);
		if (!group) throw new Error(`Group for ${ballotId} not found`);
		const access = group.permissions.results || AccessLevel.none;
		if (access < AccessLevel.ro)
			throw new Error("You do not have permission to view this data");

		if (isOnline) dispatch(loadResults(ballot.id));
	} else {
		dispatch(clearResults());
		throw new Error(`Ballot ${ballotId} not found`);
	}
	return null;
};

function ErrorPage() {
	const error: any = useRouteError();

	return (
		<div id="error-page">
			<h1>Error</h1>
			<p>
				<i>{error.statusText || error.message}</i>
			</p>
		</div>
	);
}

const route: RouteObject = {
	element: <ResultsLayout />,
	children: [
		{
			index: true,
			loader: indexLoader,
			element: null,
		},
		{
			path: ":ballotId",
			loader: ballotIdLoader,
			element: <ResultsTable />,
			errorElement: <ErrorPage />,
		},
	],
};

export default route;
