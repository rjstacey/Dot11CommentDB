import { lazy } from "react";
import { RouteObject } from "react-router";
import { membersLoader } from "../members/loader";

const AffiliationMap = lazy(() => import("./main"));

export const affiliationMapRoute: RouteObject = {
	element: <AffiliationMap />,
	loader: membersLoader,
};
