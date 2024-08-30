import { useLoaderData } from "react-router-dom";
import styles from "./Calendar.module.css";

function Calendar() {
	const calendarId = useLoaderData() as string | null;
	if (!calendarId) return null;

	// see https://support.google.com/calendar/thread/23205641/advanced-embed-option-descriptions?hl=en
	const params = {
		src: calendarId,
		mode: "WEEK", // WEEK, AGENDA or none for MONTH
		ctz: "America/New_York",
		wkst: "1", // 1 = Sunday, 2 = Monday, etc.
		showPrint: "0",
		showTitle: "0",
		showTz: "0",
	};
	const calendarLink =
		"https://calendar.google.com/calendar/embed?" +
		new URLSearchParams(params);
	return (
		<iframe
			className={styles.main}
			title="Google calendar"
			src={calendarLink}
		/>
	);
}

export default Calendar;
