import type { LoaderFunction } from "react-router";

import { store } from "@/store";
import { loadEmailTemplates } from "@/store/emailTemplates";
import { membersLoader } from "../members/loader";

export const notificationLoader: LoaderFunction = async (args) => {
	const { params } = args;
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	membersLoader(args);
	store.dispatch(loadEmailTemplates(groupName));

	return null;
};
