import { LoaderFunction } from "react-router";

import { store } from "@/store";
import { selectTopLevelGroupByName, AccessLevel } from "@/store/groups";
import {
	selectSessionAttendanceSummaryState,
	loadSessionAttendanceSummary,
} from "@/store/sessionAttendanceSummary";
import { loadSessions, selectSessionByNumber } from "@/store/sessions";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName, sessionId } =
		selectSessionAttendanceSummaryState(getState());
	if (!groupName) throw new Error("Refresh: groupName not set");
	if (sessionId) {
		dispatch(loadSessionAttendanceSummary(groupName, sessionId, true));
	}
}

export const loader: LoaderFunction = async ({ params }) => {
	const { groupName, sessionNumber } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!sessionNumber) throw new Error("Route error: sessionNumber not set");

	const { dispatch, getState } = store;
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	await dispatch(loadSessions(groupName));
	const session = selectSessionByNumber(getState(), Number(sessionNumber));
	if (session) {
		dispatch(loadSessionAttendanceSummary(groupName, session.id));
	} else {
		throw new Error("Can't find session " + sessionNumber);
	}

	return null;
};
