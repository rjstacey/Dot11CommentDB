import { RouteObject, LoaderFunction } from "react-router";

import { store } from "../store";
import { AccessLevel } from "../store/user";
import { selectTopLevelGroupByName, setTopLevelGroupId } from "../store/groups";
import { loadCommittees } from "../store/imatCommittees";

import Groups from "./Groups";

const groupsLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;

	const { dispatch, getState } = store;
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
