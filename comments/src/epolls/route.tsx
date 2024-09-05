import { LoaderFunction, RouteObject } from "react-router-dom";

import { store } from "../store";
import { selectIsOnline } from "../store/offline";
import { loadBallots } from "../store/ballots";
import { loadEpolls } from "../store/epolls";

import EpollsLayout from "./layout";

const epollsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	if (selectIsOnline(getState())) {
		dispatch(loadBallots(groupName));
		dispatch(loadEpolls(groupName));
	}
	return null;
};

const route: RouteObject = {
	element: <EpollsLayout />,
	loader: epollsLoader,
};

export default route;
