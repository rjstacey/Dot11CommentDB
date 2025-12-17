import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { selectIsOnline } from "@/store/offline";
import {
	loadBallots,
	selectBallotByBallotID,
	setCurrentBallot_id,
} from "@/store/ballots";
import { selectGroup, AccessLevel } from "@/store/groups";
import { selectResultsState, clearResults, loadResults } from "@/store/results";

export function refresh() {
	const { dispatch, getState } = store;
	const { ballot_id } = selectResultsState(getState());
	dispatch(ballot_id ? loadResults(ballot_id, true) : clearResults());
}

export const indexLoader: LoaderFunction = async () => {
	store.dispatch(clearResults());
	return null;
};

export const resultsLoader: LoaderFunction = async ({ params }) => {
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
