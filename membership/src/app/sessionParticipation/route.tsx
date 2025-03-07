import { RouteObject } from "react-router";
import { SessionParticipation } from "./layout";
import { sessionParticipationLoader } from "./loader";

export const sessionParticipationRoute: RouteObject = {
	element: <SessionParticipation />,
	loader: sessionParticipationLoader,
};
