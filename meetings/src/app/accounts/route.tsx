import { RouteObject } from "react-router";
import { loader } from "./loader";
import { AccountsLayout } from "./layout";

const route: RouteObject = {
	element: <AccountsLayout />,
	loader,
};

export default route;
