import { LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { AccessLevel } from "../store/user";
import { loadGroups, selectTopLevelGroupByName } from "../store/groups";
import { loadIeeeMembers } from "../store/ieeeMembers";
import { loadMembers } from "../store/members";
import { loadOfficers } from "../store/officers";
import { loadRecentAttendanceSummaries } from "../store/attendanceSummary";
import { loadBallotParticipation } from "../store/ballotParticipation";
import { loadAffiliationMap } from "../store/affiliationMap";

import MembersLayout from "./layout";
import MembersTable from "./table";
import MembersChart from "./chart";
import { selectMembersState } from "../store/members";
import MyProjectRosterTable from "./roster";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectMembersState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");

	dispatch(loadIeeeMembers(true));
	dispatch(loadMembers(groupName, true));
	dispatch(loadOfficers(groupName, true));
	dispatch(loadAffiliationMap(groupName, true));
	dispatch(loadRecentAttendanceSummaries(groupName, true));
	dispatch(loadBallotParticipation(groupName, true));
}

export const membersLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	// We have already loaded the members, but we need participation
	dispatch(loadAffiliationMap(groupName));
	dispatch(loadRecentAttendanceSummaries(groupName));
	dispatch(loadBallotParticipation(groupName));

	return null;
};

const route = {
	element: <MembersLayout />,
	loader: membersLoader,
	children: [
		{
			index: true,
			element: <MembersTable />,
		},
		{
			path: "chart",
			element: <MembersChart />,
		},
		{
			path: "roster",
			element: <MyProjectRosterTable />,
		},
	],
};

export default route;
