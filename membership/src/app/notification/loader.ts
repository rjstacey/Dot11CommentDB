import type { LoaderFunction } from "react-router";

import { store } from "@/store";
import { loadEmailTemplates } from "@/store/emailTemplates";
import { selectMembersState } from "@/store/members";
import { refresh as membersRefresh, membersLoader } from "../members/loader";

export function refresh() {
	const { getState, dispatch } = store;
	const { groupName } = selectMembersState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");

	membersRefresh();
	dispatch(loadEmailTemplates(groupName, true));
}

export const loader: LoaderFunction = async function (args) {
	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	membersLoader(args);
	store.dispatch(loadEmailTemplates(groupName));

	return null;
};
