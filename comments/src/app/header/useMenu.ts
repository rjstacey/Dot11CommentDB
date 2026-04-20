import { useMemo } from "react";
import { useParams } from "react-router";
import { useAppSelector } from "@/store/hooks";
import { selectTopLevelGroupByName, AccessLevel } from "@/store/groups";
import { selectCurrentBallotID } from "@/store/ballots";
import { selectCommentsSearch } from "@/store/comments";

type MenuPath = { pathname: string; search?: string };
type MenuItem = {
	to: MenuPath;
	label: string;
};

export function useMenu() {
	const { groupName } = useParams();
	const group = useAppSelector((state) =>
		groupName ? selectTopLevelGroupByName(state, groupName) : undefined,
	);
	let ballotId = useAppSelector(selectCurrentBallotID);
	if (ballotId) ballotId = encodeURIComponent(ballotId);
	const commentsSearch = useAppSelector(selectCommentsSearch);

	// Only display links for which the user has permissions
	// Replace params with the current setting
	return useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		const ballotsAccess = group.permissions.ballots || AccessLevel.none;
		const resultsAccess = group.permissions.results || AccessLevel.none;
		const commentsAccess = group.permissions.comments || AccessLevel.none;

		let pathname: string;

		if (ballotsAccess >= AccessLevel.admin) {
			pathname = `/${group.name}/ballots`;
			menu.push({
				to: { pathname },
				label: "Ballots",
			});
			pathname = `/${group.name}/voters`;
			if (ballotId) pathname += `/${ballotId}`;
			menu.push({
				to: { pathname },
				label: "Voters",
			});
		}

		if (resultsAccess >= AccessLevel.ro) {
			pathname = `/${group.name}/results`;
			if (ballotId) pathname += `/${ballotId}`;
			menu.push({
				to: { pathname },
				label: "Results",
			});
		}

		if (commentsAccess >= AccessLevel.ro) {
			pathname = `/${group.name}/comments`;
			let search: string | undefined;
			if (ballotId) {
				pathname += `/${ballotId}`;
				if (commentsSearch) search = "?" + commentsSearch.toString();
			}
			menu.push({
				to: { pathname, search },
				label: "Comments",
			});

			pathname = `/${group.name}/reports`;
			if (ballotId) pathname += `/${ballotId}`;
			menu.push({
				to: { pathname },
				label: "Reports",
			});
		}

		return menu;
	}, [group, ballotId, commentsSearch]);
}
