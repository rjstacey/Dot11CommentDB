import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { selectWorkingGroupByName, loadGroups } from "../store/groups";
import { AccessLevel } from "../store/user";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadImatMeetingAttendance } from "../store/imatMeetingAttendance";
import {
	clearBreakoutAttendance,
	loadBreakoutAttendance,
} from "../store/imatBreakoutAttendance";

import ImatAttendanceLayout from "./layout";
import ImatMeetingAttendance from "./ImatMeetingAttendance";
import ImatBreakoutAttendance from "./ImatBreakoutAttendance";

const imatAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());
	const group = selectWorkingGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(loadImatMeetings(groupName));
	return null;
};

const imatMeetingAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	if (!groupName || !meetingNumber)
		throw new Error("Route error: groupName or meetingNumber not set");
	const { dispatch } = store;
	dispatch(loadImatMeetingAttendance(groupName, meetingNumber));
	dispatch(clearBreakoutAttendance());
	return null;
};

const imatBreakoutAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	const breakoutNumber = Number(params.breakoutNumber);
	if (!groupName || !meetingNumber || !breakoutNumber)
		throw new Error("Route error: groupName or meetingNumber not set");
	store.dispatch(
		loadBreakoutAttendance(groupName, meetingNumber, breakoutNumber)
	);
	return null;
};

const route: RouteObject = {
	element: <ImatAttendanceLayout />,
	loader: imatAttendanceLoader,
	children: [
		{
			index: true,
			element: null,
		},
		{
			path: ":meetingNumber",
			children: [
				{
					index: true,
					element: <ImatMeetingAttendance />,
					loader: imatMeetingAttendanceLoader,
				},
				{
					path: ":breakoutNumber",
					element: <ImatBreakoutAttendance />,
					loader: imatBreakoutAttendanceLoader,
				},
			],
		},
	],
};

export default route;
