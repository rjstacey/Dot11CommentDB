import { RouteObject, LoaderFunction } from "react-router";

import { store } from "@/store";
import { AccessLevel } from "@/store/user";
import {
	loadGroups,
	selectTopLevelGroupByName,
	selectSelectedGroup,
	selectSubgroupByName,
	setSelectedGroupId,
} from "@/store/groups";
import { loadTimeZones } from "@/store/timeZones";
import { loadMembers } from "@/store/members";

import AppLayout from "./layout";
import ErrorPage from "./errorPage";
import Polling from "./polling";
import PollAdmin from "./admin";
import PollUser from "./user";

/*
 * Routing loaders
 */
const rootLoader: LoaderFunction = async () => {
	const { dispatch } = store;
	dispatch(loadTimeZones());
	await dispatch(loadGroups());
	return null;
};

const groupIndexLoader: LoaderFunction = async () => {
	store.dispatch(setSelectedGroupId(null));
	return null;
};

const groupLoader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	await dispatch(loadGroups());

	// Check permissions
	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	dispatch(setSelectedGroupId(group.id));
	dispatch(loadGroups(groupName));
	dispatch(loadMembers(groupName));

	return null;
};

const subgroupIndexLoader: LoaderFunction = async () => {
	store.dispatch(setSelectedGroupId(null));
	return null;
};

const subgroupLoader: LoaderFunction = async ({ params }) => {
	const { groupName, subgroupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");
	if (!subgroupName) throw new Error("Route error: subgroupName not set");

	const { dispatch, getState } = store;
	await dispatch(loadGroups());
	await dispatch(loadGroups(groupName));

	let subgroup =
		subgroupName === "WG"
			? selectSelectedGroup(getState())
			: selectSubgroupByName(getState(), subgroupName);

	dispatch(setSelectedGroupId(subgroup?.id || null));

	return null;
};

/*
 * Routes
 */
const routes: RouteObject[] = [
	{
		path: "/",
		element: <AppLayout />,
		hydrateFallbackElement: <span></span>,
		errorElement: <ErrorPage />,
		loader: rootLoader,
		children: [
			{
				index: true,
				loader: groupIndexLoader,
				element: null,
			},
			{
				path: ":groupName",
				loader: groupLoader,
				element: null,
				errorElement: <ErrorPage />,
				children: [
					{
						index: true,
						loader: subgroupIndexLoader,
						element: null,
					},
					{
						path: ":subgroupName",
						loader: subgroupLoader,
						element: <Polling />,
						children: [
							{
								index: true,
								element: <PollUser />,
							},
							{
								path: "admin",
								element: <PollAdmin />,
							},
						],
					},
				],
			},
		],
	},
	{
		path: "/*",
		element: <span>Not found</span>,
	},
];

export default routes;
