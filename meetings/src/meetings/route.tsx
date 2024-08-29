import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { loadSessions, selectSessionByNumber } from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadMeetings, LoadMeetingsConstraints } from "../store/meetings";

import MeetingsLayout from "./layout";

const meetingsLoader: LoaderFunction = async ({ params, request }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	const url = new URL(request.url);
	const sessionNumber = Number(url.searchParams.get("sessionNumber"));
	const showDateRange = Boolean(url.searchParams.get("showDateRange"));
	if (groupName) {
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
				dispatch(loadMeetings(groupName, constraints));
			}
		}
	}
	return null;
};

const route: RouteObject = {
	element: <MeetingsLayout />,
	loader: meetingsLoader,
};

export default route;
