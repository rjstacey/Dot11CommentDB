import type { LoaderFunction } from "react-router";

import { store } from "@/store";
import {
	selectTopLevelGroupByName,
	setTopLevelGroupId,
	AccessLevel,
} from "@/store/groups";
import {
	loadCommittees,
	selectImatCommitteesState,
} from "@/store/imatCommittees";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectImatCommitteesState(getState());
	if (groupName) dispatch(loadCommittees(groupName, true));
}

export const groupsLoader: LoaderFunction = async (args) => {
	const { dispatch, getState } = store;

	const { groupName } = args.params;
	const group = selectTopLevelGroupByName(getState(), groupName || "");
	if (!group) throw new Error(`Group ${groupName || "(Blank)"} not found`);
	const access = group.permissions.groups || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");
	dispatch(setTopLevelGroupId(group.id));

	if (groupName) dispatch(loadCommittees(groupName));

	return null;
};
