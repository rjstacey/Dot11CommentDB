import { RouteObject } from "react-router";

import { membersLoader } from "../members/route";
import AffiliationMap from "./AffiliationMap";

const route: RouteObject = {
	element: <AffiliationMap />,
	loader: membersLoader,
};

export default route;
