import { RouteObject, LoaderFunction } from "react-router";
import { store } from "../store";
import { AccessLevel } from "../store/user";
import { selectIsOnline } from "../store/offline";
import { selectGroup } from "../store/groups";
import {
	loadBallots,
	selectBallotByBallotID,
	selectBallotSeriesId,
	setCurrentBallot_id,
	Ballot,
} from "../store/ballots";
import { clearVoters, loadVoters } from "../store/voters";

import VotersLayout from "./layout";
import VotersTable from "./table";

const indexLoader: LoaderFunction = async () => {
	store.dispatch(clearVoters());
	return null;
};

const ballotIdLoader: LoaderFunction = async ({ params }) => {
	const { groupName, ballotId } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!ballotId) throw new Error("Route error: ballotId not set");

	const { dispatch, getState } = store;
	const isOnline = selectIsOnline(getState());

	let ballot: Ballot | undefined;
	ballot = selectBallotByBallotID(getState(), ballotId);
	if (isOnline && !ballot) {
		await dispatch(loadBallots(groupName)); // see if we get it with a ballots refresh
		ballot = selectBallotByBallotID(getState(), ballotId);
	}

	if (ballot) {
		dispatch(setCurrentBallot_id(ballot.id));

		const group = selectGroup(getState(), ballot.groupId!);
		if (!group) throw new Error(`Group for ${ballotId} not found`);
		const access = group.permissions.results || AccessLevel.none;
		if (access < AccessLevel.ro)
			throw new Error("You do not have permission to view this data");

		const ballotSeries_id = selectBallotSeriesId(getState(), ballot);
		dispatch(ballotSeries_id ? loadVoters(ballotSeries_id) : clearVoters());
	} else {
		dispatch(clearVoters());
		throw new Error(`Ballot ${ballotId} not found`);
	}

	return null;
};

const route: RouteObject = {
	element: <VotersLayout />,
	children: [
		{
			index: true,
			loader: indexLoader,
			element: null,
		},
		{
			path: ":ballotId",
			loader: ballotIdLoader,
			element: <VotersTable />,
		},
	],
};

export default route;