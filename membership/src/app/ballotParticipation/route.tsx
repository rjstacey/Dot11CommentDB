import { RouteObject } from "react-router";
import { BallotParticipation } from "./layout";
import { ballotParticipationLoader } from "./loader";

export const ballotParticipationRoute: RouteObject = {
	element: <BallotParticipation />,
	loader: ballotParticipationLoader,
};
