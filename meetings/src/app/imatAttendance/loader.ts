import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import {
	selectTopLevelGroupByName,
	loadGroups,
	AccessLevel,
} from "@/store/groups";
import {
	loadImatMeetings,
	selectImatMeetingsState,
} from "@/store/imatMeetings";
import { loadImatMeetingAttendance } from "@/store/imatMeetingAttendance";
import {
	clearBreakoutAttendance,
	loadBreakoutAttendance,
} from "@/store/imatBreakoutAttendance";

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
		dispatch(loadImatMeetingAttendance(groupName, meetingNumber, true));
	}
}

export const imatAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
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

export const imatMeetingAttendanceLoader: LoaderFunction = async ({
	params,
}) => {
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	if (!groupName || !meetingNumber)
		throw new Error("Route error: groupName or meetingNumber not set");
	const { dispatch } = store;
	dispatch(loadImatMeetingAttendance(groupName, meetingNumber));
	dispatch(clearBreakoutAttendance());
	return null;
};

export const imatBreakoutAttendanceLoader: LoaderFunction = async ({
	params,
}) => {
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	const breakoutNumber = Number(params.breakoutNumber);
	if (!groupName || !meetingNumber || !breakoutNumber)
		throw new Error("Route error: groupName or meetingNumber not set");
	const { dispatch } = store;
	dispatch(loadBreakoutAttendance(groupName, meetingNumber, breakoutNumber));
	return null;
};
