import { LoaderFunction } from "react-router-dom";
import { store } from "../store";
import { loadSessions } from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";

import SessionsLayout from "./layout";

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
	element: <SessionsLayout />,
	loader: sessionsLoader,
};

export default route;
