import type { LoaderFunction } from "react-router";

import { store } from "@/store";
import { selectTopLevelGroupByName, AccessLevel } from "@/store/groups";
import {
	selectMembershipOverTimeState,
	loadMembershipOverTime,
} from "@/store/membershipOverTime";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectMembershipOverTimeState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");

	dispatch(loadMembershipOverTime(groupName, true));
}

export const loader: LoaderFunction = async (args) => {
	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(loadMembershipOverTime(groupName));

	return null;
};
