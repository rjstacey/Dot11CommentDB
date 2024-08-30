import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { selectWorkingGroupByName } from "../store/groups";
import { AccessLevel } from "../store/user";
import { loadImatMeetings } from "../store/imatMeetings";

import ImatMeetingsLayout from "./layout";

const imatMeetingsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	const group = selectWorkingGroupByName(getState(), groupName);
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
