import { RouteObject, LoaderFunction } from "react-router";

import { store } from "../store";
import {
	selectWorkingGroupByName,
	loadGroups,
	selectGroupsState,
	setWorkingGroupId,
} from "../store/groups";
import { loadCommittees } from "../store/imatCommittees";

import Groups from "./Groups";

const groupsLoader: LoaderFunction = async ({ params }) => {
	const { dispatch, getState } = store;
	const { groupName } = params;
	if (groupName) {
		const { valid } = selectGroupsState(getState());
		if (!valid) {
			await dispatch(loadGroups());
		}
		const group = selectWorkingGroupByName(getState(), groupName);
		dispatch(setWorkingGroupId(group?.id || null));
		dispatch(loadCommittees(groupName));
	}
	return null;
};

const route: RouteObject = {
	element: <Groups />,
	loader: groupsLoader,
};

export default route;
