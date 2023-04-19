import React from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';
import {displayDayDate, displayTime} from 'dot11-components/lib';

import {loadBreakoutAttendance, selectBreakoutAttendanceState, selectImatMeeting, selectImatBreakout, dataSet} from '../store/imatBreakoutAttendance';

import TopRow from '../components/TopRow';

import {renderSessionInfo} from './ImatBreakouts';

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	display: flex;
	flex-direction: column;
	align-items: center;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

export const renderBreakoutInfo = (breakout) =>
	<div style={{display: 'flex', flexDirection: 'column'}}>
		<span>{breakout.Name}</span>
		<span>{displayDayDate(breakout.Start)}</span>
		<span>{displayTime(breakout.Start) + ' - ' + displayTime(breakout.End)}</span>
		<span>{breakout.location}</span>
	</div>
	

const columns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'SAPIN', 
		label: 'SA PIN',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'Name',
		label: 'Name',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Affiliation', 
		label: 'Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Email', 
		label: 'Email',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Timestamp', 
		label: 'Timestamp',
		width: 150, flexGrow: 1, flexShrink: 1},
];

const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);

function BreakoutAttendance() {
	const navigate = useNavigate();
	const params = useParams();

	const dispatch = useDispatch();
	const {valid, imatMeetingId, imatBreakoutId} = useSelector(selectBreakoutAttendanceState);
	const imatMeeting = useSelector(selectImatMeeting);
	const breakout = useSelector(selectImatBreakout);

	React.useEffect(() => {
		if (!valid ||
			(params.meetingNumber && params.meetingNumber !== imatMeetingId) ||
			(params.breakoutNumber && params.breakoutNumber !== imatBreakoutId))
			dispatch(loadBreakoutAttendance(params.meetingNumber, params.breakoutNumber));
	}, [dispatch, valid, params.meetingNumber, imatMeetingId, params.breakoutNumber, imatBreakoutId]);

	const close = () => navigate(`/${params.groupName}/imatMeetings/${imatMeetingId}`);
	const refresh = () => dispatch(loadBreakoutAttendance(imatMeetingId, imatBreakoutId));

	return (
		<>
			<TopRow style={{maxWidth}}>
				<div>{imatMeeting && renderSessionInfo(imatMeeting)}</div>
				<div>{breakout && renderBreakoutInfo(breakout)}</div>
				<div>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					<ActionButton name='close' title='Close' onClick={close} />
				</div>
			</TopRow>

			<TableRow>
				<AppTable
					fitWidth
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
					dataSet={dataSet}
				/>
			</TableRow>
		</>
	)
}

export default BreakoutAttendance;
