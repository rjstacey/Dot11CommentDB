import { LoaderFunction, RouteObject } from "react-router-dom";
import { store } from "../store";
import { loadCalendarAccounts } from "../store/calendarAccounts";
import { loadWebexAccounts } from "../store/webexAccounts";

import AccountsLayout from "./layout";

const accountsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const { dispatch } = store;
	dispatch(loadCalendarAccounts(groupName));
	dispatch(loadWebexAccounts(groupName));
	return null;
};

const route: RouteObject = {
	element: <AccountsLayout />,
	loader: accountsLoader,
};

export default route;
