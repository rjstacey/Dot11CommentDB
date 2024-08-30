import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { loadImatMeetings } from "../store/imatMeetings";

import ImatMeetingsLayout from "./layout";

const imatMeetingsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	store.dispatch(loadImatMeetings(groupName));
	return null;
};

const route: RouteObject = {
	element: <ImatMeetingsLayout />,
	loader: imatMeetingsLoader,
};

export default route;
