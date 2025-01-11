import { RouteObject, LoaderFunction } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import {
	loadGroups,
	selectTopLevelGroupByName,
	setTopLevelGroupId,
} from "@/store/groups";
import {
	loadCommittees,
	selectImatCommitteesState,
} from "@/store/imatCommittees";

import Groups from "./Groups";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectImatCommitteesState(getState());
	if (groupName) dispatch(loadCommittees(groupName, true));
}

const groupsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	const group = selectTopLevelGroupByName(getState(), groupName || "");
	if (!group) throw new Error(`Group ${groupName || "(Blank)"} not found`);
	const access = group.permissions.groups || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");
	dispatch(setTopLevelGroupId(group.id));

	if (groupName) dispatch(loadCommittees(groupName));

	return null;
};

const route: RouteObject = {
	element: <Groups />,
	loader: groupsLoader,
};

export default route;
