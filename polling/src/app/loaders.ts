import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { loadTimeZones } from "@/store/timeZones";
import {
	loadGroups,
	selectSubgroupByName,
	setSelectedGroupId,
	selectTopLevelGroupByName,
	setTopLevelGroupId,
	AccessLevel,
} from "@/store/groups";
import { loadMembers } from "@/store/members";

export const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(loadTimeZones());
	await dispatch(loadGroups());

	return null;
};

export const groupIndexLoader: LoaderFunction = async () => {
	store.dispatch(setTopLevelGroupId(null));
	return null;
};

export const groupLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());

	// Check permissions
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.polling || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");
	dispatch(setTopLevelGroupId(group.id));

	dispatch(loadGroups(groupName));
	dispatch(loadMembers(groupName));

	return null;
};

export const subgroupIndexLoader: LoaderFunction = async () => {
	store.dispatch(setSelectedGroupId(null));
	return null;
};

export const subgroupLoader: LoaderFunction = async ({ params }) => {
	const { groupName, subgroupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!subgroupName) throw new Error("Route error: subgroupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	await dispatch(loadGroups(groupName));

	const subgroup = selectSubgroupByName(getState(), subgroupName);
	dispatch(setSelectedGroupId(subgroup?.id || null));

	return null;
};
