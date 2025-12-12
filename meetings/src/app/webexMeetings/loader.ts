import type { LoaderFunction } from "react-router";
import { store, setError } from "@/store";
import {
	selectTopLevelGroupByName,
	loadGroups,
	AccessLevel,
} from "@/store/groups";
import { loadSessions, selectSessionByNumber } from "@/store/sessions";
import { loadImatMeetings } from "@/store/imatMeetings";
import {
	loadWebexMeetings,
	selectWebexMeetingsState,
} from "@/store/webexMeetings";
import { WebexMeetingsQuery } from "@/store/webexMeetingsSelectors";
import { setCurrentSessionId, setShowDateRange } from "@/store/current";

export function refresh() {
	const { dispatch, getState } = store;

	const { groupName, query } = selectWebexMeetingsState(getState());
	if (!groupName) throw Error("Refresh error: groupName not set");
	dispatch(loadWebexMeetings(groupName, query, true));
}

export const rootLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	store.dispatch(loadSessions(groupName));
	return null;
};

export const webexMeetingsLoader: LoaderFunction = async ({
	params,
	request,
}) => {
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
			const query: WebexMeetingsQuery = {};
			if (showDateRange) {
				query.fromDate = session.startDate;
				query.toDate = session.endDate;
				query.timezone = session.timezone;
			} else {
				query.sessionId = session.id;
			}
			dispatch(loadWebexMeetings(groupName, query));
			return session;
		} else {
			dispatch(
				setError("Session not found", `sessionNumber=${sessionNumber}`)
			);
		}
	}
	return null;
};
