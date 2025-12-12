import type { LoaderFunction, RouteObject } from "react-router";
import { store, setError } from "@/store";
import {
	selectTopLevelGroupByName,
	loadGroups,
	AccessLevel,
} from "@/store/groups";
import { loadSessions, selectSessionByNumber, Session } from "@/store/sessions";
import { loadImatMeetings } from "@/store/imatMeetings";
import {
	loadImatMeetingAttendance,
	clearImatMeetingAttendance,
} from "@/store/imatMeetingAttendance";

import MainLayout from "./main";
import BranchLayout from "./branch";
import ReportsChart from "./chart";

const rootLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	store.dispatch(loadSessions(groupName));
	return null;
};

const sessionsLoader: LoaderFunction = async ({
	params,
}): Promise<Session | null> => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const sessionNumber = Number(params.sessionNumber);

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
			const imatMeetingId = session.imatMeetingId;
			if (imatMeetingId) {
				dispatch(loadImatMeetingAttendance(groupName, imatMeetingId));
			} else {
				dispatch(clearImatMeetingAttendance());
			}
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
	element: <MainLayout />,
	loader: rootLoader,
	children: [
		{
			path: ":sessionNumber",
			element: <BranchLayout />,
			loader: sessionsLoader,
			children: [
				{
					index: true,
					element: null,
				},
				{
					path: ":chart",
					element: <ReportsChart />,
				},
			],
		},
	],
};

export default route;
