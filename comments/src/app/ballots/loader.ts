import type { LoaderFunction } from "react-router";
import { store } from "@/store";
import { selectIsOnline } from "@/store/offline";
import {
	selectTopLevelGroupByName,
	AccessLevel,
	loadGroups,
} from "@/store/groups";
import { loadBallots, selectBallotsState } from "@/store/ballots";

export function refresh() {
	const { dispatch, getState } = store;

	const { groupName } = selectBallotsState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");

	dispatch(loadBallots(groupName, true));
}

export const loader: LoaderFunction = async ({ params }) => {
	const { groupName } = params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	if (selectIsOnline(getState())) await dispatch(loadGroups());

	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.ballots || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");
};
