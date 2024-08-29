import { LoaderFunction } from "react-router-dom";
import { store } from "../store";
import { loadCalendarAccounts } from "../store/calendarAccounts";
import { loadWebexAccounts } from "../store/webexAccounts";

import AccountsLayout from "./layout";

const accountsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadCalendarAccounts(groupName));
		dispatch(loadWebexAccounts(groupName));
	}
	return null;
};

const route = {
	element: <AccountsLayout />,
	loader: accountsLoader,
};

export default route;
