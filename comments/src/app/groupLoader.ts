import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { selectIsOnline } from "@/store/offline";
import {
	loadGroups,
	selectTopLevelGroupByName,
	AccessLevel,
} from "@/store/groups";
import { loadMembers } from "@/store/members";
import { loadBallots } from "@/store/ballots";

import { rootLoader } from "./rootLoader";

export const groupLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	if (selectIsOnline(getState())) await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);

	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.ballots || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	if (selectIsOnline(getState())) {
		dispatch(loadGroups(groupName));
		dispatch(loadMembers(groupName));
		dispatch(loadBallots(groupName));
	}
	return null;
};
