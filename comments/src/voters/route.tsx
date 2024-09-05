import { RouteObject, LoaderFunction } from "react-router";
import { store } from "../store";
import { selectIsOnline } from "../store/offline";
import {
	loadBallots,
	selectBallotByBallotID,
	selectBallotSeriesId,
	setCurrentBallot_id,
	Ballot,
} from "../store/ballots";
import { loadMembers } from "../store/members";
import { clearVoters, loadVoters } from "../store/voters";

import Voters from "./layout";

const indexLoader: LoaderFunction = async () => {
	store.dispatch(clearVoters());
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
		let ballotSeries_id: number | undefined;
		ballot = selectBallotByBallotID(getState(), ballotId);
		if (!ballot) {
			await p; // see if we get it with a ballots refresh
			ballot = selectBallotByBallotID(getState(), ballotId);
		}
		dispatch(setCurrentBallot_id(ballot ? ballot.id : null));
		if (ballot) ballotSeries_id = selectBallotSeriesId(getState(), ballot);
		dispatch(ballotSeries_id ? loadVoters(ballotSeries_id) : clearVoters());
	}
	return null;
};

const route: RouteObject = {
	element: <Voters />,
	children: [
		{
			index: true,
			loader: indexLoader,
		},
		{
			path: ":ballotId",
			loader: ballotIdLoader,
		},
	],
};

export default route;
