import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import {
	selectTopLevelGroupByName,
	loadGroups,
	AccessLevel,
} from "@/store/groups";
import { loadSessions, selectSessionsState } from "@/store/sessions";
import { loadImatMeetings } from "@/store/imatMeetings";

export function refresh() {
	const { dispatch, getState } = store;

	const groupName = selectSessionsState(getState()).groupName;
	if (!groupName) throw new Error("Refresh error: no groupName");

	dispatch(loadSessions(groupName, true));
	dispatch(loadImatMeetings(groupName, true));
}

export const loader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(loadSessions(groupName));
	dispatch(loadImatMeetings(groupName));
	return null;
};
