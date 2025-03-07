import { RouteObject } from "react-router";
import AffiliationMap from "./AffiliationMap";
import { membersLoader } from "../members/loader";

export const affiliationMapRoute: RouteObject = {
	element: <AffiliationMap />,
	loader: membersLoader,
};
