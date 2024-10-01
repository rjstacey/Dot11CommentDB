import { LoaderFunction } from "react-router-dom";
import { store } from "../store";

import { loadSessionAttendees } from "../store/sessionAttendees";

import SessionAttendanceLayout from "./layout";
import SessionAttendanceTable from "./table";
import SessionAttendanceChart from "./chart";

const sessionAttendanceLoader: LoaderFunction = async ({ params, request }) => {
	const { dispatch } = store;
	const { groupName, sessionNumber } = params;
	const searchParams = new URL(request.url).searchParams;
	const useDaily =
		searchParams.has("useDaily") &&
		searchParams.get("useDaily") !== "false";
	if (groupName && sessionNumber) {
		dispatch(
			loadSessionAttendees(groupName, Number(sessionNumber), useDaily)
		);
	}
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
			],
		},
	],
};

export default route;
