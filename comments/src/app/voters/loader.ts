import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { selectIsOnline } from "@/store/offline";
import { selectGroup, AccessLevel } from "@/store/groups";
import {
	loadBallots,
	selectBallotByBallotID,
	selectBallotSeriesId,
	setCurrentBallot_id,
} from "@/store/ballots";
import { clearVoters, loadVoters, selectVotersState } from "@/store/voters";

export function refresh() {
	const { dispatch, getState } = store;
	const ballot_id = selectVotersState(getState()).ballot_id;
	dispatch(ballot_id ? loadVoters(ballot_id, true) : clearVoters());
}

export const indexLoader: LoaderFunction = async () => {
	store.dispatch(clearVoters());
	return null;
};

export const votersLoader: LoaderFunction = async ({ params }) => {
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

		const ballotSeries_id = selectBallotSeriesId(getState(), ballot);
		if (isOnline)
			dispatch(
				ballotSeries_id ? loadVoters(ballotSeries_id) : clearVoters()
			);
	} else {
		dispatch(clearVoters());
		throw new Error(`Ballot ${ballotId} not found`);
	}

	return null;
};
