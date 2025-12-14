import { LoaderFunction } from "react-router";

import { store } from "@/store";
import {
	loadGroups,
	selectTopLevelGroupByName,
	AccessLevel,
} from "@/store/groups";
import { loadSessions } from "@/store/sessions";
import { loadIeeeMembers } from "@/store/ieeeMembers";
import { loadMembers, selectMembersState } from "@/store/members";
import { loadOfficers } from "@/store/officers";
import { loadRecentAttendanceSummaries } from "@/store/sessionParticipation";
import { loadBallotParticipation } from "@/store/ballotParticipation";
import { loadAffiliationMap } from "@/store/affiliationMap";

export function refresh() {
	const { dispatch, getState } = store;
	const { groupName } = selectMembersState(getState());
	if (!groupName) throw new Error("Route error: groupName not set");

	dispatch(loadGroups(groupName));
	dispatch(loadSessions(groupName, true));
	dispatch(loadIeeeMembers(true));
	dispatch(loadMembers(groupName, true));
	dispatch(loadOfficers(groupName, true));
	dispatch(loadAffiliationMap(groupName, true));
	dispatch(loadRecentAttendanceSummaries(groupName, true));
	dispatch(loadBallotParticipation(groupName, true));
}

export const membersLoader: LoaderFunction = async (args) => {
	const { groupName } = args.params;
	if (!groupName) throw new Error("Route error: groupName not set");

	const { dispatch, getState } = store;

	const group = selectTopLevelGroupByName(getState(), groupName);
	if (!group) throw new Error(`Group ${groupName} not found`);
	const access = group.permissions.members || AccessLevel.none;
	if (access < AccessLevel.ro)
		throw new Error("You don't have permission to view this data");

	// We have already loaded the members, but we need participation
	dispatch(loadAffiliationMap(groupName));
	dispatch(loadRecentAttendanceSummaries(groupName));
	dispatch(loadBallotParticipation(groupName));

	return null;
};
