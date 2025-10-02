import { RouteObject } from "react-router";

import { loader } from "./loader";
import EpollsLayout from "./main";

const route: RouteObject = {
	Component: EpollsLayout,
	loader,
};

export default route;
