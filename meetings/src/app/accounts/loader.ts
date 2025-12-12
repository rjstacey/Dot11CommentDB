import { LoaderFunction } from "react-router";
import { store } from "@/store";
import {
	selectTopLevelGroupByName,
	loadGroups,
	AccessLevel,
} from "@/store/groups";

import {
	loadCalendarAccounts,
	clearCalendarAccounts,
	selectCalendarAccountsGroupName,
} from "@/store/calendarAccounts";
import {
	loadWebexAccounts,
	clearWebexAccounts,
	selectWebexAccountsGroupName,
} from "@/store/webexAccounts";

export function refreshCalendarAccounts() {
	const { dispatch, getState } = store;
	const groupName = selectCalendarAccountsGroupName(getState());
	dispatch(
		groupName
			? loadCalendarAccounts(groupName, true)
			: clearCalendarAccounts()
	);
}

export function refreshWebexAccounts() {
	const { dispatch, getState } = store;
	const groupName = selectWebexAccountsGroupName(getState());
	dispatch(
		groupName ? loadWebexAccounts(groupName, true) : clearWebexAccounts()
	);
}

export const loader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.meetings || AccessLevel.none;
	if (access < AccessLevel.admin)
		throw new Error("You don't have permission to view this data");

	dispatch(loadCalendarAccounts(groupName));
	dispatch(loadWebexAccounts(groupName));

	return null;
};
