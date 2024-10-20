import { LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { AccessLevel } from "../store/user";
import { selectTopLevelGroupByName } from "../store/groups";
import { loadRecentAttendanceSummaries } from "../store/attendanceSummary";
import { loadBallotParticipation } from "../store/ballotParticipation";
import { loadAffiliationMap } from "../store/affiliationMap";

import MembersLayout from "./layout";
import MembersTable from "./table";
import MembersChart from "./chart";

export const membersLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	// We have already loaded the members, but we need participation
	dispatch(loadRecentAttendanceSummaries(groupName));
	dispatch(loadBallotParticipation(groupName));
	dispatch(loadAffiliationMap(groupName));

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
	],
};

export default route;
