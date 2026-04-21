import { useMemo } from "react";
import { useParams } from "react-router";
import { useAppSelector } from "@/store/hooks";
import { selectTopLevelGroupByName, AccessLevel } from "@/store/groups";
import { selectCurrentSession } from "@/store/sessions";
import { selectBreakoutMeetingId } from "@/store/imatBreakouts";

type MenuPath = { pathname: string; search?: string };
type MenuItem = {
	to: MenuPath;
	label: string;
};

export function useMenu() {
	const groupName = useParams().groupName || "*";
	const group = useAppSelector((state) =>
		selectTopLevelGroupByName(state, groupName!),
	);
	const access = group?.permissions.meetings || AccessLevel.none;
	const session = useAppSelector(selectCurrentSession);
	const imatBreakoutMeetingId = useAppSelector(selectBreakoutMeetingId);

	return useMemo(() => {
		const menu: MenuItem[] = [];

		// No menu items if there is no group
		if (!group) return menu;

		if (access >= AccessLevel.admin) {
			menu.push({
				to: { pathname: `/${group.name}/accounts` },
				label: "Accounts",
			});
		}

		if (access >= AccessLevel.ro) {
			menu.push({
				to: { pathname: `/${group.name}/sessions` },
				label: "Sessions",
			});
			menu.push({
				to: {
					pathname:
						`/${group.name}/meetings` +
						(session ? `/${session.number}` : ""),
				},
				label: "Meetings",
			});
			menu.push({
				to: {
					pathname:
						`/${group.name}/webexMeetings` +
						(session ? `/${session.number}` : ""),
				},
				label: "Webex",
			});
			menu.push({
				to: {
					pathname:
						`/${group.name}/imatBreakouts` +
						(imatBreakoutMeetingId
							? `/${imatBreakoutMeetingId}`
							: ""),
				},
				label: "IMAT breakouts",
			});
			menu.push({
				to: { pathname: `/${group.name}/imatMeetings` },
				label: "IMAT sessions",
			});
			menu.push({
				to: { pathname: `/${group.name}/calendar` },
				label: "Calendar",
			});
			menu.push({
				to: { pathname: `/${group.name}/ieee802World` },
				label: "802 World",
			});
			menu.push({
				to: {
					pathname:
						`/${group.name}/reports` +
						(session ? `/${session.number}` : ""),
				},
				label: "Reports",
			});
		}
		return menu;
	}, [access, group, session, imatBreakoutMeetingId]);
}
