import { displayDayDate, displayTime } from "dot11-components";
import { useAppSelector } from "@/store/hooks";
import {
	selectBreakoutEntities,
	selectBreakoutMeetingId,
} from "@/store/imatBreakouts";

function ImatBreakoutInfo({
	imatMeetingId,
	breakoutId,
}: {
	imatMeetingId: number;
	breakoutId: number;
}) {
	const imatBreakoutEntities = useAppSelector(selectBreakoutEntities);
	const breakoutMeetingId = useAppSelector(selectBreakoutMeetingId);
	const breakout =
		breakoutMeetingId === imatMeetingId
			? imatBreakoutEntities[breakoutId]
			: undefined;

	const content = breakout ? (
		<>
			<span>{breakout.name}</span>
			<span>{displayDayDate(breakout.start)}</span>
			<span>
				{displayTime(breakout.start) +
					" - " +
					displayTime(breakout.end)}
			</span>
			<span>{breakout.location}</span>
		</>
	) : null;

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{content}
		</div>
	);
}

export default ImatBreakoutInfo;
