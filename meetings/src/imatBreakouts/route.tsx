import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { loadImatMeetings } from "../store/imatMeetings";
import { loadBreakouts, clearBreakouts } from "../store/imatBreakouts";

import ImatBreakoutsLayout from "./layout";
import ImatBreakoutsTable from "./table";

const imatBreakoutsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	store.dispatch(loadImatMeetings(groupName));
	return null;
};

const breakoutNumberLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	if (!groupName || !meetingNumber)
		throw new Error("Route error: groupName or meetingNumber not set");
	store.dispatch(loadBreakouts(groupName, meetingNumber));
	return null;
};

const breakoutIndexLoader: LoaderFunction = () => {
	store.dispatch(clearBreakouts());
	return null;
};

const route: RouteObject = {
	element: <ImatBreakoutsLayout />,
	loader: imatBreakoutsLoader,
	children: [
		{
			index: true,
			element: null,
			loader: breakoutIndexLoader,
		},
		{
			path: ":meetingNumber",
			element: <ImatBreakoutsTable />,
			loader: breakoutNumberLoader,
		},
	],
};

export default route;
