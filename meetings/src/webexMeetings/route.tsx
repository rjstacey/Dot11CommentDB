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
import { loadWebexMeetings } from "../store/webexMeetings";
import { LoadMeetingsConstraints } from "../store/meetingsSelectors";

import WebexMeetingsLayout from "./layout";

export type LoaderData = Session | null;

const webexMeetingsLoader: LoaderFunction = async ({
	params,
	request,
}): Promise<LoaderData> => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const url = new URL(request.url);
	const sessionNumber = Number(url.searchParams.get("sessionNumber"));
	const showDateRange = Boolean(url.searchParams.get("showDateRange"));

	const { dispatch, getState } = store;
	const group = selectWorkingGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(loadSessions(groupName));
	dispatch(loadImatMeetings(groupName));
	if (sessionNumber) {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (session) {
			const constraints: LoadMeetingsConstraints = {};
			if (showDateRange) {
				constraints.fromDate = session.startDate;
				constraints.toDate = session.endDate;
				constraints.timezone = session.timezone;
			} else {
				constraints.sessionId = "" + session.id;
			}
			dispatch(loadWebexMeetings(groupName, constraints));
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
	element: <WebexMeetingsLayout />,
	loader: webexMeetingsLoader,
};

export default route;
