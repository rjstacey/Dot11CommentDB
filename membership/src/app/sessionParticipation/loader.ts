import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import { loadGroups, selectTopLevelGroupByName } from "@/store/groups";
import { loadSessions } from "@/store/sessions";
import {
	loadRecentAttendanceSummaries,
	selectAttendanceSummaryGroupName,
} from "@/store/attendanceSummary";

export async function refresh() {
	const { dispatch, getState } = store;
	const groupName = selectAttendanceSummaryGroupName(getState());
	if (!groupName) throw new Error("Route error: groupName not set");
	await dispatch(loadSessions(groupName, true));
	dispatch(loadRecentAttendanceSummaries(groupName, true));
}

export const sessionParticipationLoader: LoaderFunction = async ({
	params,
}) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	await dispatch(loadSessions(groupName));
	dispatch(loadRecentAttendanceSummaries(groupName));

	return null;
};
