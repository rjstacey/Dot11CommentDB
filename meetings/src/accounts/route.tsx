import { LoaderFunction, RouteObject } from "react-router-dom";
import { store } from "../store";
import { loadCalendarAccounts } from "../store/calendarAccounts";
import { selectWorkingGroupByName } from "../store/groups";
import { AccessLevel } from "../store/user";
import { loadWebexAccounts } from "../store/webexAccounts";

import AccountsLayout from "./layout";

const accountsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	const { dispatch, getState } = store;
	const group = selectWorkingGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");
	dispatch(loadCalendarAccounts(groupName));
	dispatch(loadWebexAccounts(groupName));
	return null;
};

const route: RouteObject = {
	element: <AccountsLayout />,
	loader: accountsLoader,
};

export default route;
