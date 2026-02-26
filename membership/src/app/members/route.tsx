import { lazy } from "react";
import { RouteObject } from "react-router";
import { membersLoader } from "./loader";

const MembersLayout = lazy(() => import("./layout"));

export const membersRoute: RouteObject = {
	element: <MembersLayout />,
	loader: membersLoader,
};
