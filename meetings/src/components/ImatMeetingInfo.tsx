import { displayDateRange } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectImatMeetingEntities } from "@/store/imatMeetings";

function ImatMeetingInfo({ imatMeetingId }: { imatMeetingId: number }) {
	const imatMeetingEntities = useAppSelector(selectImatMeetingEntities);
	const imatMeeting = imatMeetingEntities[imatMeetingId];
	const content = imatMeeting ? (
		<>
			<span>{imatMeeting.name}</span>
			<span>{displayDateRange(imatMeeting.start, imatMeeting.end)}</span>
			<span>{imatMeeting.timezone}</span>
		</>
	) : null;
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{content}
		</div>
	);
}

export default ImatMeetingInfo;
