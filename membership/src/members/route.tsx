import { LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { loadAttendances } from "../store/sessionParticipation";
import { loadBallotParticipation } from "../store/ballotParticipation";
import { loadAffiliationMap } from "../store/affiliationMap";

import MembersLayout from "./layout";
import MembersTable from "./table";
import MembersChart from "./chart";

const membersLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		// We have already loaded the members, but we need participation
		dispatch(loadAttendances(groupName));
		dispatch(loadBallotParticipation(groupName));
		dispatch(loadAffiliationMap(groupName));
	}
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
