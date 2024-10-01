import { RouteObject, LoaderFunction } from "react-router-dom";

import { store } from "../store";
import { loadMembers } from "../store/members";
import { loadEmailTemplates } from "../store/email";

import Notification from "./Notification";

const notificationsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch } = store;
	const { groupName } = params;
	if (groupName) {
		dispatch(loadMembers(groupName));
		dispatch(loadEmailTemplates(groupName));
	}
	return null;
};

const route: RouteObject = {
	element: <Notification />,
	loader: notificationsLoader,
};

export default route;
