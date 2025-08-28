import { LoaderFunction } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import { loadGroups, selectTopLevelGroupByName } from "@/store/groups";
import {
	loadSessionAttendees,
	clearSessionAttendees,
	selectSessionAttendeesState,
} from "@/store/sessionAttendees";
import {
	loadRecentAttendanceSummaries,
	selectAttendanceSummaryState,
} from "@/store/attendanceSummary";
import { loadSessions, selectSessionByNumber } from "@/store/sessions";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectAttendanceSummaryState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");
	const { sessionId, useDaily } = selectSessionAttendeesState(getState());
	if (sessionId) {
		dispatch(loadSessionAttendees(groupName, sessionId, useDaily, true));
	}
	dispatch(loadRecentAttendanceSummaries(groupName, true));
}

export const loader: LoaderFunction = async ({ params, request }) => {
	const { groupName, sessionNumber } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	const searchParams = new URL(request.url).searchParams;
	const useDaily =
		searchParams.has("useDaily") &&
		searchParams.get("useDaily") !== "false";
	if (sessionNumber) {
		await dispatch(loadSessions(groupName));
		const session = selectSessionByNumber(
			getState(),
			Number(sessionNumber)
		);
		if (session) {
			dispatch(loadSessionAttendees(groupName, session.id, useDaily));
		} else {
			throw new Error("Can't find session " + sessionNumber);
		}
	} else {
		dispatch(clearSessionAttendees());
	}
	dispatch(loadRecentAttendanceSummaries(groupName));

	return null;
};
