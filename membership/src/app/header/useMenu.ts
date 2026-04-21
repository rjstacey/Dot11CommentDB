import { useMemo } from "react";

import { useAppSelector } from "@/store/hooks";
import { selectWorkingGroup, AccessLevel } from "@/store/groups";
import {
	selectImatAttendanceSummaryState,
	selectImatAttendanceSummarySession,
} from "@/store/imatAttendanceSummary";

type MenuPath = { pathname: string; search?: string };
type MenuItem = {
	to: MenuPath;
	label: string;
};

export function useMenu() {
	//const groupName = useParams().groupName || "";
	const group = useAppSelector(selectWorkingGroup);
	const session = useAppSelector(selectImatAttendanceSummarySession);
	const { useDaily } = useAppSelector(selectImatAttendanceSummaryState);
	let sessionAttendanceLink = "sessionAttendance";
	if (session?.number) {
		sessionAttendanceLink += `/${session.number}`;
		if (useDaily) sessionAttendanceLink += "?useDaily=true";
	}

	// Only display links for which the user has permissions
	// Replace params with the current setting
	return useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		// Groups link for "root" (/groups) or committee/working group ("/:groupName/groups")
		const groupsAccess = group.permissions.groups || AccessLevel.none;
		if (groupsAccess >= AccessLevel.ro) {
			menu.push({
				to: { pathname: `/${group.name}/groups` },
				label: "Groups",
			});
		}

		const membersAccess = group.permissions.members || AccessLevel.none;

		if (membersAccess >= AccessLevel.ro) {
			menu.push({
				to: { pathname: `/${group.name}/members` },
				label: "Members",
			});
		}

		if (membersAccess >= AccessLevel.admin) {
			menu.push({
				to: { pathname: `/${group.name}/sessionParticipation` },
				label: "Session participation",
			});
			menu.push({
				to: { pathname: `/${group.name}/ballotParticipation` },
				label: "Ballot participation",
			});
			menu.push({
				to: { pathname: `/${group.name}/${sessionAttendanceLink}` },
				label: "Session attendance",
			});
			menu.push({
				to: { pathname: `/${group.name}/notification` },
				label: "Notification",
			});
		}

		if (membersAccess >= AccessLevel.ro) {
			menu.push({
				to: { pathname: `/${group.name}/affiliationMap` },
				label: "Affiliation map",
			});
			menu.push({
				to: { pathname: `/${group.name}/membershipOverTime` },
				label: "Membership over time",
			});
			menu.push({
				to: { pathname: `/${group.name}/reports` },
				label: "Reports",
			});
		}

		return menu;
	}, [group, session]);
}
