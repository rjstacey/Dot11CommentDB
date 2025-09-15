import { LoaderFunction, RouteObject } from "react-router";

import { store } from "@/store";
import { selectTopLevelGroupByName, loadGroups } from "@/store/groups";
import { AccessLevel } from "@/store/user";
import { loadImatMeetings } from "@/store/imatMeetings";
import {
	loadBreakouts,
	clearBreakouts,
	selectBreakoutsState,
} from "@/store/imatBreakouts";

import ImatBreakoutsLayout from "./layout";
import ImatBreakoutsTable from "./table";
import { rootLoader } from "../rootLoader";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName, imatMeetingId } = selectBreakoutsState(getState());
	if (!groupName) throw Error("Refresh error; no groupName");
	dispatch(loadImatMeetings(groupName, true));
	if (imatMeetingId) dispatch(loadBreakouts(groupName, imatMeetingId));
}

const imatBreakoutsLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(loadImatMeetings(groupName));
	return null;
};

const breakoutNumberLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName } = args.params;
	const meetingNumber = Number(args.params.meetingNumber);
	if (!groupName || !meetingNumber)
		throw new Error("Route error: groupName or meetingNumber not set");
	store.dispatch(loadBreakouts(groupName, meetingNumber));
	return null;
};

const breakoutIndexLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

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
