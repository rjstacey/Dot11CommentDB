import { lazy } from "react";
import { RouteObject } from "react-router";
import { ballotParticipationLoader } from "./loader";

const BallotParticipation = lazy(() => import("./layout"));

export const ballotParticipationRoute: RouteObject = {
	element: <BallotParticipation />,
	loader: ballotParticipationLoader,
};
