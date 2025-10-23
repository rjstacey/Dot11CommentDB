import { LoaderFunction, RouteObject } from "react-router";
import { AccessLevel } from "@common";
import { store } from "@/store";
import { selectTopLevelGroupByName, loadGroups } from "@/store/groups";

import AccountsLayout from "./layout";
import { rootLoader } from "../rootLoader";

const accountsLoader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	return null;
};

const route: RouteObject = {
	element: <AccountsLayout />,
	loader: accountsLoader,
};

export default route;
