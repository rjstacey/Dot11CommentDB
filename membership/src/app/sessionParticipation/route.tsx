import { RouteObject } from "react-router";
import { loader } from "./loader";
import SessionParticipation from "./layout";

export const sessionParticipationRoute: RouteObject = {
	element: <SessionParticipation />,
	loader,
};
