import { LoaderFunction, Outlet, RouteObject } from "react-router";
import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import { loadGroups, selectTopLevelGroupByName } from "@/store/groups";
import { loadRecentAttendanceSummaries } from "@/store/attendanceSummary";
import SessionParticipationLayout from "./layout";
import { selectAttendanceSummaryGroupName } from "@/store/attendanceSummary";
import { loadSessions } from "@/store/sessions";
import SessionParticipationStats from "./stats";

export async function refresh() {
	const { dispatch, getState } = store;
	const groupName = selectAttendanceSummaryGroupName(getState());
	if (!groupName) throw new Error("Route error: groupName not set");
	await dispatch(loadSessions(groupName, true));
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

	await dispatch(loadSessions(groupName));
	dispatch(loadRecentAttendanceSummaries(groupName));

	return null;
};

const route: RouteObject = {
	element: <Outlet />,
	loader: sessionParticipationLoader,
	children: [
		{
			index: true,
			element: <SessionParticipationLayout />,
		},
		{
			path: "stats",
			element: <SessionParticipationStats />,
		},
	],
};

export default route;
