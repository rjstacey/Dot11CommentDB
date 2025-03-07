import type { LoaderFunction } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import { loadGroups, selectTopLevelGroupByName } from "@/store/groups";
import {
	loadBallotParticipation,
	selectBallotParticipationState,
} from "@/store/ballotParticipation";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectBallotParticipationState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");

	dispatch(loadBallotParticipation(groupName, true));
}

export const ballotParticipationLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	dispatch(loadBallotParticipation(groupName));

	return null;
};
