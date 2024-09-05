import { RouteObject, LoaderFunction } from "react-router";
import { store } from "../store";
import { selectIsOnline } from "../store/offline";
import {
	loadBallots,
	selectBallotByBallotID,
	setCurrentBallot_id,
	Ballot,
} from "../store/ballots";
import { loadMembers } from "../store/members";
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
	if (selectIsOnline(getState())) {
		const p = dispatch(loadBallots(groupName));
		dispatch(loadMembers(groupName));
		let ballot: Ballot | undefined;
		ballot = selectBallotByBallotID(getState(), ballotId);
		if (!ballot) {
			await p; // see if we get it with a ballots refresh
			ballot = selectBallotByBallotID(getState(), ballotId);
		}
		dispatch(setCurrentBallot_id(ballot ? ballot.id : null));
		dispatch(ballot ? loadResults(ballot.id) : clearResults());
	}
	return null;
};

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
		},
	],
};

export default route;
