import * as React from "react";

import { useAppSelector } from "../store/hooks";
import { selectWorkingGroupId } from "../store/groups";
import {
	selectCalendarAccountsState,
	CalendarAccount,
} from "../store/calendarAccounts";

import styles from "./Calendar.module.css";

function Calendar() {
	const { entities } = useAppSelector(selectCalendarAccountsState);
	const groupId = useAppSelector(selectWorkingGroupId);

	const calendarLink = React.useMemo(() => {
		if (!groupId) return undefined;
		for (const account of Object.values(entities) as CalendarAccount[]) {
			if (account.groupId === groupId && account.details) {
				const { details } = account;
				// see https://support.google.com/calendar/thread/23205641/advanced-embed-option-descriptions?hl=en
				const params = {
					src: details.id,
					mode: "WEEK", // WEEK, AGENDA or none for MONTH
					ctz: "America/New_York",
					wkst: "1", // 1 = Sunday, 2 = Monday, etc.
					showPrint: "0",
					showTitle: "0",
					showTz: "0",
				};
				return (
					`https://calendar.google.com/calendar/embed?` +
					new URLSearchParams(params)
				);
			}
		}
	}, [entities, groupId]);

	return (
		<iframe
			className={styles.main}
			title="Google calendar"
			src={calendarLink}
		/>
	);
}

export default Calendar;
