import { LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { AccessLevel } from "../store/user";
import { selectTopLevelGroupByName } from "../store/groups";
import { loadSessionAttendees } from "../store/sessionAttendees";

import SessionAttendanceLayout from "./layout";
import SessionAttendanceTable from "./table";
import SessionAttendanceChart from "./chart";
import SessionRegistration from "./sessionRegistration";
import { loadRecentAttendanceSummaries } from "../store/attendanceSummary";

const sessionAttendanceLoader: LoaderFunction = async ({ params, request }) => {
	const { groupName, sessionNumber } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

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
	if (sessionNumber) {
		dispatch(
			loadSessionAttendees(groupName, Number(sessionNumber), useDaily)
		);
	}
	dispatch(loadRecentAttendanceSummaries(groupName));

	return null;
};

const route = {
	element: <SessionAttendanceLayout />,
	children: [
		{
			path: ":sessionNumber",
			loader: sessionAttendanceLoader,
			children: [
				{
					index: true,
					element: <SessionAttendanceTable />,
				},
				{
					path: "chart",
					element: <SessionAttendanceChart />,
				},
				{
					path: "registration",
					element: <SessionRegistration />,
				},
			],
		},
	],
};

export default route;
