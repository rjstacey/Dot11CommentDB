import { RouteObject, LoaderFunction } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import { loadGroups, selectTopLevelGroupByName } from "@/store/groups";
import { loadMembers } from "@/store/members";
import { loadEmailTemplates } from "@/store/emailTemplates";

import Notification from "./Notification";

const notificationsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	dispatch(loadMembers(groupName));
	dispatch(loadEmailTemplates(groupName));

	return null;
};

const route: RouteObject = {
	element: <Notification />,
	loader: notificationsLoader,
};

export default route;
