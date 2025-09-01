import type { LoaderFunction } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import { selectTopLevelGroupByName } from "@/store/groups";
import {
	loadBallotParticipation,
	selectBallotParticipationState,
} from "@/store/ballotParticipation";
import { rootLoader } from "../rootLoader";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectBallotParticipationState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");

	dispatch(loadBallotParticipation(groupName, true));
}

export const ballotParticipationLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { dispatch, getState } = store;

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	dispatch(loadBallotParticipation(groupName));

	return null;
};
