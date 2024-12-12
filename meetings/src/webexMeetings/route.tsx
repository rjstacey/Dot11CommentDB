import { LoaderFunction, RouteObject } from "react-router-dom";

import { setError } from "dot11-components";
import { store } from "../store";
import { selectTopLevelGroupByName, loadGroups } from "../store/groups";
import { AccessLevel } from "../store/user";
import {
	loadSessions,
	selectSessionByNumber,
	Session,
} from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";
import {
	loadWebexMeetings,
	selectWebexMeetingsState,
} from "../store/webexMeetings";
import { LoadMeetingsConstraints } from "../store/meetingsSelectors";
import { setCurrentSessionId, setShowDateRange } from "../store/current";

import WebexMeetingsLayout from "./layout";

export function refresh() {
	const { dispatch, getState } = store;

	const { groupName, query } = selectWebexMeetingsState(getState());
	if (!groupName) throw Error("Refresh error: groupName not set");
	dispatch(loadWebexMeetings(groupName, query, true));
}

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
			dispatch(setCurrentSessionId(session.id));
			dispatch(setShowDateRange(showDateRange));
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
