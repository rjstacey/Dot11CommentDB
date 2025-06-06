import { useAppSelector } from "@/store/hooks";
import { selectSyncedMeetingEntities, getField } from "@/store/meetings";

import styles from "./MeetingSummary.module.css";

function MeetingSummary({ meetingId }: { meetingId?: number | null }) {
	const meetingEntities = useAppSelector(selectSyncedMeetingEntities);
	const meeting = meetingId ? meetingEntities[meetingId] : undefined;
	let content: JSX.Element | null = null;
	if (meeting) {
		const summary = (meeting.isCancelled ? "🚫 " : "") + meeting.summary;
		content = (
			<>
				<span>{summary}</span>
				<span>{getField(meeting, "location") as string}</span>
				<span style={{ fontStyle: "italic", fontSize: "smaller" }}>
					{getField(meeting, "date")} {getField(meeting, "timeRange")}
				</span>
			</>
		);
	}
	return <div className={styles.main}>{content}</div>;
}

export default MeetingSummary;
