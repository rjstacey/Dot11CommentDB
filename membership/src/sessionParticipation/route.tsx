import { LoaderFunction } from "react-router-dom";
import { store } from "../store";
import { AccessLevel } from "../store/user";
import { loadGroups, selectTopLevelGroupByName } from "../store/groups";
import {
	loadRecentAttendanceSummaries,
	selectAttendanceSummaryState,
} from "../store/attendanceSummary";
import SessionParticipationLayout from "./layout";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectAttendanceSummaryState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");
	dispatch(loadRecentAttendanceSummaries(groupName, true));
}

const sessionParticipationLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	dispatch(loadRecentAttendanceSummaries(groupName));

	return null;
};

const route = {
	element: <SessionParticipationLayout />,
	loader: sessionParticipationLoader,
};

export default route;
