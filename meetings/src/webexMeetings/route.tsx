import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { loadSessions, selectSessionByNumber } from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadWebexMeetings } from "../store/webexMeetings";
import { LoadMeetingsConstraints } from "../store/meetingsSelectors";

import WebexMeetingsLayout from "./layout";

const webexMeetingsLoader: LoaderFunction = async ({ params, request }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const url = new URL(request.url);
	const sessionNumber = Number(url.searchParams.get("sessionNumber"));
	const showDateRange = Boolean(url.searchParams.get("showDateRange"));
	const { dispatch, getState } = store;
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
		}
	}
	return null;
};

const route: RouteObject = {
	element: <WebexMeetingsLayout />,
	loader: webexMeetingsLoader,
};

export default route;
