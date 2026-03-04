import { RouteObject } from "react-router";
import { loader } from "./loader";
import { BallotParticipationLayout } from "./layout";

export const ballotParticipationRoute: RouteObject = {
	Component: BallotParticipationLayout,
	loader,
};
