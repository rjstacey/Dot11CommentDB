import { LoaderFunction, RouteObject } from "react-router";

import { store, setError } from "@/store";
import {
	selectTopLevelGroupByName,
	loadGroups,
	AccessLevel,
} from "@/store/groups";
import { loadSessions, selectSessionByNumber, Session } from "@/store/sessions";
import { loadImatMeetings } from "@/store/imatMeetings";
import {
	selectMeetingsState,
	loadMeetings,
	MeetingsQuery,
} from "@/store/meetings";
import { setCurrentSessionId, setShowDateRange } from "@/store/current";

import { MeetingsLayout } from "./layout";
import { MeetingsMain } from "./main";
import { rootLoader } from "../rootLoader";

export function refresh() {
	const { dispatch, getState } = store;

	const { groupName, query } = selectMeetingsState(getState());
	if (!groupName) throw Error("Refresh error: groupName not set");
	dispatch(loadMeetings(groupName, query, true));
}

export type LoaderData = Session | null;

const meetingsLoader: LoaderFunction<LoaderData> = async (
	args
): Promise<LoaderData> => {
	await rootLoader(args);

	const { params, request } = args;
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const url = new URL(request.url);
	const sessionNumber = Number(params.sessionNumber);
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
			const query: MeetingsQuery = {};
			if (showDateRange) {
				query.fromDate = session.startDate;
				query.toDate = session.endDate;
				query.timezone = session.timezone;
			} else {
				query.sessionId = session.id;
			}
			dispatch(loadMeetings(groupName, query));
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
	children: [
		{
			path: ":sessionNumber",
			element: <MeetingsMain />,
			loader: meetingsLoader,
		},
	],
};

export default route;
