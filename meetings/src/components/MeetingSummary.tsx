import { useAppSelector } from '../store/hooks';

import {
	selectMeetingEntities,
	getField
} from '../store/meetings';

function MeetingSummary({meetingId}: {meetingId: number}) {
	const meetingEntities = useAppSelector(selectMeetingEntities);
	const meeting = meetingEntities[meetingId];
	if (!meeting) {
		console.error('Bad meetingId');
		return <span>Bad meetingId</span>;
	}
	//const textDecoration = meeting.isCancelled? 'line-through': 'none';
	let summary = meeting.summary;
	if (meeting.isCancelled)
		summary = '🚫 ' + summary;
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<span /*style={{textDecoration}}*/>
				{summary}
			</span>
			<span>{getField(meeting, 'location') as string}</span>
			<span style={{fontStyle: 'italic', fontSize: 'smaller'/*, textDecoration*/}}>
				{getField(meeting, 'date') as string} {getField(meeting, 'timeRange') as string}
			</span>
		</div>
	)
}

export default MeetingSummary;
