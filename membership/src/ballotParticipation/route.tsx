import { RouteObject, LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { loadBallotParticipation } from "../store/ballotParticipation";

import BallotParticipation from "./BallotParticipation";

const ballotParticipationLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadBallotParticipation(groupName));
	}
	return null;
};

const route: RouteObject = {
	element: <BallotParticipation />,
	loader: ballotParticipationLoader,
};

export default route;
