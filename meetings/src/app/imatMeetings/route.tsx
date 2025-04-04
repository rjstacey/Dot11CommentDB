import { LoaderFunction, RouteObject } from "react-router";

import { store } from "@/store";
import { selectTopLevelGroupByName } from "@/store/groups";
import { AccessLevel } from "@/store/user";
import {
	loadImatMeetings,
	selectImatMeetingsState,
} from "@/store/imatMeetings";

import ImatMeetingsLayout from "./layout";

export function refresh() {
	const { dispatch, getState } = store;
	const groupName = selectImatMeetingsState(getState()).groupName;
	if (!groupName) throw Error("Refresh error; no groupName");
	dispatch(loadImatMeetings(groupName, true));
}

const imatMeetingsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(loadImatMeetings(groupName));
	return null;
};

const route: RouteObject = {
	element: <ImatMeetingsLayout />,
	loader: imatMeetingsLoader,
};

export default route;
