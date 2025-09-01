import { type LoaderFunction } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import {
	loadGroups,
	selectTopLevelGroupByName,
	setTopLevelGroupId,
	type Group,
} from "@/store/groups";
import { loadMembers } from "@/store/members";
import { loadIeeeMembers } from "@/store/ieeeMembers";
import { loadOfficers } from "@/store/officers";
import { loadSessions } from "@/store/sessions";
import { rootLoader } from "./rootLoader";

export const groupLoader: LoaderFunction = async (args) => {
	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await rootLoader(args);

	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(setTopLevelGroupId(group.id));
	const critical: Promise<void | Group[]>[] = [];
	critical.push(dispatch(loadGroups(groupName)));
	critical.push(dispatch(loadSessions(groupName)));
	dispatch(loadIeeeMembers());
	dispatch(loadMembers(groupName));
	dispatch(loadOfficers(groupName));
	await Promise.all(critical);

	return null;
};
