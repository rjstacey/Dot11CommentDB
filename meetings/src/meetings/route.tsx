import { LoaderFunction, RouteObject } from "react-router-dom";

import { setError } from "dot11-components";
import { store } from "../store";
import { selectWorkingGroupByName, loadGroups } from "../store/groups";
import { AccessLevel } from "../store/user";
import {
	loadSessions,
	selectSessionByNumber,
	Session,
} from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadMeetings, LoadMeetingsConstraints } from "../store/meetings";

import MeetingsLayout from "./layout";

export type LoaderData = Session | null;

const meetingsLoader: LoaderFunction<LoaderData> = async ({
	params,
	request,
}): Promise<LoaderData> => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const url = new URL(request.url);
	const sessionNumber = Number(url.searchParams.get("sessionNumber"));
	const showDateRange = Boolean(url.searchParams.get("showDateRange"));

	const { dispatch, getState } = store;

	await dispatch(loadGroups());
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
			const constraints: LoadMeetingsConstraints = {};
			if (showDateRange) {
				constraints.fromDate = session.startDate;
				constraints.toDate = session.endDate;
				constraints.timezone = session.timezone;
			} else {
				constraints.sessionId = "" + session.id;
			}
			dispatch(loadMeetings(groupName, constraints));
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
	element: <MeetingsLayout />,
	loader: meetingsLoader,
};

export default route;
