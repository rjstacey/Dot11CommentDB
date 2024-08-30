import { LoaderFunction, RouteObject } from "react-router-dom";

import { setError } from "dot11-components";
import { store } from "../store";
import { loadSessions, selectSessionByNumber } from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadMeetings, LoadMeetingsConstraints } from "../store/meetings";

import MeetingsLayout from "./layout";

const meetingsLoader: LoaderFunction = async ({ params, request }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const url = new URL(request.url);
	const sessionNumber = Number(url.searchParams.get("sessionNumber"));
	const showDateRange = Boolean(url.searchParams.get("showDateRange"));
	const { dispatch, getState } = store;
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
