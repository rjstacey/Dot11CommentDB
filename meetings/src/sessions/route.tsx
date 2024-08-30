import { LoaderFunction } from "react-router-dom";
import { store } from "../store";
import { loadSessions } from "../store/sessions";
import { loadImatMeetings } from "../store/imatMeetings";

import SessionsLayout from "./layout";

const sessionsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const { dispatch } = store;
	dispatch(loadSessions(groupName));
	dispatch(loadImatMeetings(groupName));
	return null;
};

const route = {
	element: <SessionsLayout />,
	loader: sessionsLoader,
};

export default route;
