import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import {
	selectTopLevelGroupByName,
	AccessLevel,
	loadGroups,
} from "@/store/groups";
import { loadSessions } from "@/store/sessions";
import { loadRecentAttendanceSummaries } from "@/store/sessionParticipation";
import { selectAttendanceSummariesGroupName } from "@/store/attendanceSummaries";

export async function refresh() {
	const { dispatch, getState } = store;
	const groupName = selectAttendanceSummariesGroupName(getState());
	if (!groupName) throw new Error("Route error: groupName not set");
	await dispatch(loadSessions(groupName, true));
	dispatch(loadRecentAttendanceSummaries(groupName, true));
}

export const loader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;

	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

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
