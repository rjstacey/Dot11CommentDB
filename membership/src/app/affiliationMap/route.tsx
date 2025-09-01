import { RouteObject } from "react-router";
import { membersLoader } from "../members/loader";
import AffiliationMap from "./main";

export const affiliationMapRoute: RouteObject = {
	Component: AffiliationMap,
	loader: membersLoader,
};
