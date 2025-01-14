import { LoaderFunction, RouteObject } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import { selectIsOnline } from "@/store/offline";
import { loadGroups, selectTopLevelGroupByName } from "@/store/groups";

import AppError from "../errorPage";
import Ballots from "./Ballots";

const ballotsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	if (selectIsOnline(getState())) await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.ballots || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	return null;
};

const route: RouteObject = {
	loader: ballotsLoader,
	element: <Ballots />,
	errorElement: <AppError />,
};

export default route;
