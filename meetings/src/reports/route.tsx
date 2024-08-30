import { LoaderFunction, RouteObject } from "react-router-dom";
import { store } from "../store";
import { loadSessions, selectSessionByNumber } from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";
import {
	loadImatMeetingAttendance,
	clearImatMeetingAttendance,
} from "../store/imatMeetingAttendance";
import { loadBreakouts } from "../store/imatBreakouts";

import ReportsLayout from "./layout";
import ReportsChart from "./chart";

const sessionsLoader: LoaderFunction = async ({ params, request }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const url = new URL(request.url);
	const sessionNumber = Number(url.searchParams.get("sessionNumber"));
	const { dispatch, getState } = store;
	dispatch(loadSessions(groupName));
	dispatch(loadImatMeetings(groupName));
	if (sessionNumber) {
		const session = selectSessionByNumber(getState(), sessionNumber);
		const imatMeetingId = session?.imatMeetingId;
		console.log(imatMeetingId);
		if (imatMeetingId) {
			dispatch(loadBreakouts(groupName, imatMeetingId));
			dispatch(loadImatMeetingAttendance(groupName, imatMeetingId));
		} else {
			dispatch(clearImatMeetingAttendance());
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
