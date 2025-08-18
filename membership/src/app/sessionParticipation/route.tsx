import { lazy } from "react";
import { RouteObject } from "react-router";
import { loader } from "./loader";

const SessionParticipation = lazy(() => import("./layout"));

export const sessionParticipationRoute: RouteObject = {
	element: <SessionParticipation />,
	loader,
};
