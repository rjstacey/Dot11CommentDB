import { LoaderFunction } from "react-router";

import { store } from "@/store";
import { selectTopLevelGroupByName, AccessLevel } from "@/store/groups";
import {
	loadImatAttendanceSummary,
	selectImatAttendanceSummaryState,
} from "@/store/imatAttendanceSummary";
import { loadAttendanceSummary } from "@/store/attendanceSummaries";
import { loadSessions, selectSessionByNumber } from "@/store/sessions";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectImatAttendanceSummaryState(getState());
	if (!groupName) throw new Error("Refresh: groupName not set");
	const { sessionId, useDaily } =
		selectImatAttendanceSummaryState(getState());
	if (sessionId) {
		dispatch(
			loadImatAttendanceSummary(groupName, sessionId, useDaily, true),
		);
		dispatch(loadAttendanceSummary(groupName, sessionId, true));
	}
}

export const loader: LoaderFunction = async ({ params, request }) => {
	const { groupName, sessionNumber } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!sessionNumber) throw new Error("Route error: sessionNumber not set");

	const { dispatch, getState } = store;
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	const searchParams = new URL(request.url).searchParams;
	const useDaily =
		searchParams.has("useDaily") &&
		searchParams.get("useDaily") !== "false";
	await dispatch(loadSessions(groupName));
	const session = selectSessionByNumber(getState(), Number(sessionNumber));
	if (session) {
		dispatch(loadImatAttendanceSummary(groupName, session.id, useDaily));
		dispatch(loadAttendanceSummary(groupName, session.id));
	} else {
		throw new Error("Can't find session " + sessionNumber);
	}

	return null;
};
