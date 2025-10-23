import type { LoaderFunction } from "react-router";
import { shallowEqualArrays } from "shallow-equal";
import { AccessLevel } from "@common";
import { store } from "@/store";
import { selectIsOnline } from "@/store/offline";
import { selectGroup } from "@/store/groups";
import {
	loadBallots,
	selectBallotByBallotID,
	setCurrentBallot_id,
	selectCurrentBallot_id,
} from "@/store/ballots";
import {
	clearComments,
	loadComments,
	selectCommentsState,
	setSelected,
	setPanelIsSplit,
} from "@/store/comments";

import { rootLoader } from "../rootLoader";

export function refresh() {
	const { dispatch, getState } = store;
	const ballot_id = selectCurrentBallot_id(getState());
	dispatch(ballot_id ? loadComments(ballot_id, true) : clearComments());
}

export const indexLoader: LoaderFunction = async (args) => {
	await rootLoader(args);
	store.dispatch(clearComments());
	return null;
};

export const ballotIdLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName, ballotId } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!ballotId) throw new Error("Route error: ballotId not set");

	const { dispatch, getState } = store;
	const isOnline = selectIsOnline(getState());

	if (isOnline) await dispatch(loadBallots(groupName));

	const ballot = selectBallotByBallotID(getState(), ballotId);
	dispatch(setCurrentBallot_id(ballot ? ballot.id : null));
	if (ballot) {
		const group = selectGroup(getState(), ballot.groupId!);
		if (!group) throw new Error(`Group for ${ballotId} not found`);
		const access = group.permissions.comments || AccessLevel.none;
		if (access < AccessLevel.ro)
			throw new Error("You do not have permission to view this data");

		if (isOnline) dispatch(loadComments(ballot.id));
	} else {
		dispatch(clearComments());
		throw new Error(`Ballot ${ballotId} not found`);
	}
};

export const commentsLoader: LoaderFunction = async (args) => {
	await ballotIdLoader(args);

	const { dispatch, getState } = store;

	const url = new URL(args.request.url);
	const detail = url.searchParams.get("detail") === "1";
	dispatch(setPanelIsSplit({ isSplit: detail }));

	const cids = url.searchParams.getAll("cid");
	const { ids, entities, selected } = selectCommentsState(getState());
	const newSelected: string[] = [];
	for (const id of ids) {
		const entity = entities[id]!;
		if (cids.includes(entity.CID)) newSelected.push(id as string);
	}
	if (!shallowEqualArrays(selected, newSelected))
		dispatch(setSelected(newSelected));
};
