import type { LoaderFunction } from "react-router";

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
import { loadTimeZones } from "@/store/timeZones";
import { loadSessions } from "@/store/sessions";

export const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(loadTimeZones());
	await dispatch(loadGroups());
	return null;
};

export const groupLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	// Check permissions
	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	const wait: Promise<void | Group[]>[] = [];
	dispatch(setTopLevelGroupId(group.id));
	wait.push(dispatch(loadGroups(groupName)));
	wait.push(dispatch(loadSessions(groupName)));
	dispatch(loadIeeeMembers());
	dispatch(loadMembers(groupName));
	dispatch(loadOfficers(groupName));
	await Promise.all(wait);

	return null;
};
