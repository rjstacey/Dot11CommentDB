import { LoaderFunction, RouteObject } from "react-router";
import { store } from "@/store";
import { selectTopLevelGroupByName, loadGroups } from "@/store/groups";
import { AccessLevel } from "@/store/user";
import { loadSessions, selectSessionsState } from "@/store/sessions";
import { loadImatMeetings } from "@/store/imatMeetings";

import SessionsLayout from "./layout";

export function refresh() {
	const { dispatch, getState } = store;

	const groupName = selectSessionsState(getState()).groupName;
	if (!groupName) throw new Error("Refresh error: no groupName");

	dispatch(loadSessions(groupName, true));
	dispatch(loadImatMeetings(groupName, true));
}

const sessionsLoader: LoaderFunction = async ({ params }) => {
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

const route: RouteObject = {
	element: <SessionsLayout />,
	loader: sessionsLoader,
};

export default route;
