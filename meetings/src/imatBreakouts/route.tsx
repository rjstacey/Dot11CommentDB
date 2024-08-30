import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { selectWorkingGroupByName } from "../store/groups";
import { AccessLevel } from "../store/user";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadBreakouts, clearBreakouts } from "../store/imatBreakouts";

import ImatBreakoutsLayout from "./layout";
import ImatBreakoutsTable from "./table";

const imatBreakoutsLoader: LoaderFunction = async ({ params }) => {
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

const breakoutNumberLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	if (!groupName || !meetingNumber)
		throw new Error("Route error: groupName or meetingNumber not set");
	store.dispatch(loadBreakouts(groupName, meetingNumber));
	return null;
};

const breakoutIndexLoader: LoaderFunction = () => {
	store.dispatch(clearBreakouts());
	return null;
};

const route: RouteObject = {
	element: <ImatBreakoutsLayout />,
	loader: imatBreakoutsLoader,
	children: [
		{
			index: true,
			element: null,
			loader: breakoutIndexLoader,
		},
		{
			path: ":meetingNumber",
			element: <ImatBreakoutsTable />,
			loader: breakoutNumberLoader,
		},
	],
};

export default route;
