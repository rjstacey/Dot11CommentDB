import { LoaderFunction } from "react-router-dom";
import { store } from "../store";

import { loadSessionAttendees } from "../store/sessionAttendees";

import SessionAttendanceLayout from "./layout";
import SessionAttendanceTable from "./table";
import SessionAttendanceChart from "./chart";

const sessionAttendanceLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName, sessionNumber } = params;
	if (groupName && sessionNumber) {
		dispatch(loadSessionAttendees(groupName, Number(sessionNumber)));
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
