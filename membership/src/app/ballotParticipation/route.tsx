import { RouteObject } from "react-router";
import { ballotParticipationLoader } from "./loader";
import BallotParticipation from "./layout";

export const ballotParticipationRoute: RouteObject = {
	Component: BallotParticipation,
	loader: ballotParticipationLoader,
};
