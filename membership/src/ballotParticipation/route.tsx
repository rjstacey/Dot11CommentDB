import { RouteObject, LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { loadBallotParticipation } from "../store/ballotParticipation";

import BallotParticipation from "./BallotParticipation";

const ballotParticipationLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch } = store;
	dispatch(loadBallotParticipation(groupName));

	return null;
};

const route: RouteObject = {
	element: <BallotParticipation />,
	loader: ballotParticipationLoader,
};

export default route;
