import { LoaderFunction } from "react-router-dom";
import { store } from "../store";
import { loadSessions } from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";

import ReportsLayout from "./layout";
import ReportsChart from "./chart";

const sessionsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadSessions(groupName));
		dispatch(loadImatMeetings(groupName));
	}
	return null;
};

const route = {
	element: <ReportsLayout />,
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
};

export default route;
