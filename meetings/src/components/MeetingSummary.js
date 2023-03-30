import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import {
	selectMeetingEntities,
	getField
} from '../store/meetings';

function MeetingSummary({meetingId}) {
	const meetingEntities = useSelector(selectMeetingEntities);
	const meeting = meetingEntities[meetingId];
	const textDecoration = meeting.isCancelled? 'line-through': 'none';
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<span style={{textDecoration}}>
				{meeting.summary}
			</span>
			<span>{getField(meeting, 'location')}</span>
			<span style={{fontStyle: 'italic', fontSize: 'smaller', textDecoration}}>
				{getField(meeting, 'date')} {getField(meeting, 'timeRange')}
			</span>
		</div>
	)
}

MeetingSummary.propTypes = {
	meetingId: PropTypes.any.isRequired
}

export default MeetingSummary;
