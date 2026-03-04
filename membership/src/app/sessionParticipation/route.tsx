import { RouteObject } from "react-router";
import { loader } from "./loader";
import { SessionParticipationLayout } from "./layout";

export const sessionParticipationRoute: RouteObject = {
	Component: SessionParticipationLayout,
	loader,
};
