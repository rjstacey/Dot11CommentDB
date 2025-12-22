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
import {
	pollingSocketConnect,
	pollingSocketJoinGroup,
	pollingSocketLeaveGroup,
} from "@/store/pollingSocket";

export const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(pollingSocketConnect());
	dispatch(loadTimeZones());
	await dispatch(loadGroups());

	return null;
};

export const groupIndexLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(setTopLevelGroupId(null));
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
	const { dispatch } = store;
	dispatch(setSelectedGroupId(null));
	dispatch(pollingSocketLeaveGroup());
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
	if (!subgroup) throw new Error(`Subgroup ${subgroupName} does not exist`);

	dispatch(setSelectedGroupId(subgroup.id));
	dispatch(pollingSocketJoinGroup(subgroup.id));

	return null;
};
