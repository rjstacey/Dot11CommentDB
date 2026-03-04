import { lazy } from "react";
import { RouteObject } from "react-router";
import { membersLoader } from "../../members/loader";

const MembersReport = lazy(() => import("."));

export const route: RouteObject = {
	loader: membersLoader,
	hydrateFallbackElement: <div>Loading...</div>,
	element: <MembersReport />,
};
