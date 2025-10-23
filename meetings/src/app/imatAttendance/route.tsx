import type { LoaderFunction, RouteObject } from "react-router";
import { AccessLevel } from "@common";
import { store } from "@/store";
import { selectTopLevelGroupByName, loadGroups } from "@/store/groups";
import {
	loadImatMeetings,
	selectImatMeetingsState,
} from "@/store/imatMeetings";
import { loadImatMeetingAttendance } from "@/store/imatMeetingAttendance";
import {
	clearBreakoutAttendance,
	loadBreakoutAttendance,
} from "@/store/imatBreakoutAttendance";

import ImatAttendanceLayout from "./layout";
import ImatMeetingAttendance from "./ImatMeetingAttendance";
import ImatBreakoutAttendance from "./ImatBreakoutAttendance";
import { rootLoader } from "../rootLoader";

export function refresh(
	meetingNumber: number | undefined,
	breakoutNumber: number | undefined
) {
	const { dispatch, getState } = store;
	const groupName = selectImatMeetingsState(getState()).groupName;
	if (!groupName) throw Error("Refresh error; no groupName");
	dispatch(loadImatMeetings(groupName));
	if (meetingNumber && breakoutNumber) {
		dispatch(
			loadBreakoutAttendance(
				groupName,
				meetingNumber,
				breakoutNumber,
				true
			)
		);
	} else if (meetingNumber) {
		dispatch(loadImatMeetingAttendance(groupName, meetingNumber));
	}
}

const imatAttendanceLoader: LoaderFunction = async (args) => {
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
	const { dispatch } = store;
	dispatch(loadBreakoutAttendance(groupName, meetingNumber, breakoutNumber));
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
