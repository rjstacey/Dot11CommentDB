import type { LoaderFunction } from "react-router";
import { AccessLevel } from "@common";
import { store } from "@/store";
import { selectTopLevelGroupByName } from "@/store/groups";
import { loadBallots, selectBallotsState } from "@/store/ballots";
import { rootLoader } from "../rootLoader";

export function refresh() {
	const { dispatch, getState } = store;

	const { groupName } = selectBallotsState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");

	dispatch(loadBallots(groupName!, true));
}

export const loader: LoaderFunction = async (args) => {
	await rootLoader(args);

	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { getState } = store;

	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error("Invalid group: " + groupName);
	const access = group.permissions.ballots || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	return null;
};
