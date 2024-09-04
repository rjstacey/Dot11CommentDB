import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { selectIsOnline } from "../store/offline";
import { loadBallots } from "../store/ballots";

import Ballots from "./Ballots";

const ballotsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		dispatch(loadBallots(groupName));
	}
	return null;
};

const route: RouteObject = {
	element: <Ballots />,
	loader: ballotsLoader,
};

export default route;
