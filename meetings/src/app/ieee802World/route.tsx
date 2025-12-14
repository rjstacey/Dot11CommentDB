import type { RouteObject } from "react-router";
import { loader } from "./loader";
import { Ieee802WorldMain } from "./main";

const route: RouteObject = {
	element: <Ieee802WorldMain />,
	loader,
};

export default route;
