import { LoaderFunction, RouteObject } from "react-router-dom";
import { setError } from "dot11-components";
import { store } from "../store";
import { selectWorkingGroupByName } from "../store/groups";
import { AccessLevel } from "../store/user";
import {
	loadSessions,
	selectSessionByNumber,
	Session,
} from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";
import {
	loadImatMeetingAttendance,
	clearImatMeetingAttendance,
} from "../store/imatMeetingAttendance";

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
	const group = selectWorkingGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	const p1 = dispatch(loadSessions(groupName));
	dispatch(loadImatMeetings(groupName));
	if (sessionNumber) {
		let session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			// If we don't get the session wait to see the load returns it
			await p1;
			session = selectSessionByNumber(getState(), sessionNumber);
		}
		if (session) {
			const imatMeetingId = session.imatMeetingId;
			console.log(imatMeetingId);
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
