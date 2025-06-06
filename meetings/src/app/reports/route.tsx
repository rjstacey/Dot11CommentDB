import { LoaderFunction, RouteObject } from "react-router";
import { setError } from "dot11-components";
import { store } from "@/store";
import { selectTopLevelGroupByName, loadGroups } from "@/store/groups";
import { AccessLevel } from "@/store/user";
import { loadSessions, selectSessionByNumber, Session } from "@/store/sessions";
import { loadImatMeetings } from "@/store/imatMeetings";
import {
	loadImatMeetingAttendance,
	clearImatMeetingAttendance,
} from "@/store/imatMeetingAttendance";

import ReportsLayout from "./layout";
import ReportsChart from "./chart";

export type LoaderData = Session | null;

const sessionsLoader: LoaderFunction = async ({
	params,
	request,
}): Promise<Session | null> => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const url = new URL(request.url);
	const sessionNumber = Number(url.searchParams.get("sessionNumber"));

	const { dispatch, getState } = store;

	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(loadImatMeetings(groupName));
	await dispatch(loadSessions(groupName));
	if (sessionNumber) {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (session) {
			const imatMeetingId = session.imatMeetingId;
			if (imatMeetingId) {
				dispatch(loadImatMeetingAttendance(groupName, imatMeetingId));
			} else {
				dispatch(clearImatMeetingAttendance());
			}
			return session;
		} else {
			dispatch(
				setError("Session not found", `sessionNumber=${sessionNumber}`)
			);
		}
	}
	return null;
};

const route: RouteObject = {
	element: <ReportsLayout />,
	loader: sessionsLoader,
	children: [
		{
			index: true,
			element: null,
		},
		{
			path: ":chart",
			element: <ReportsChart />,
		},
	],
};

export default route;
