import type { LoaderFunction } from "react-router";
import { AccessLevel } from "@common";
import { store } from "@/store";
import {
	loadGroups,
	selectTopLevelGroupByName,
	setTopLevelGroupId,
} from "@/store/groups";
import { loadMembers } from "@/store/members";

import { rootLoader } from "./rootLoader";

export const groupIndexLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	store.dispatch(setTopLevelGroupId(null));
	return null;
};

export const groupLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());

	// Check permissions
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.polling || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");
	dispatch(setTopLevelGroupId(group.id));

	dispatch(loadGroups(groupName));
	dispatch(loadMembers(groupName));

	return null;
};
