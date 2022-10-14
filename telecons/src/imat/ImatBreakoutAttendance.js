import React from 'react';
import {useHistory, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';
import {displayDayDate, displayTime} from 'dot11-components/lib';

import {loadBreakoutAttendance, selectBreakoutAttendanceState, dataSet} from '../store/imatBreakoutAttendance';
import {selectImatMeetingEntities} from '../store/imatMeetings';
import {selectBreakoutEntities} from '../store/imatBreakouts';

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
	const history = useHistory();
	const params = useParams();

	const dispatch = useDispatch();
	const {valid, meetingNumber, breakoutNumber} = useSelector(selectBreakoutAttendanceState);
	const meeting = useSelector(selectImatMeetingEntities)[meetingNumber];
	const breakout = useSelector(selectBreakoutEntities)[breakoutNumber];

	React.useEffect(() => {
		if (!valid ||
			(params.meetingNumber && params.meetingNumber !== meetingNumber) ||
			(params.breakoutNumber && params.breakoutNumber !== breakoutNumber))
			dispatch(loadBreakoutAttendance(params.meetingNumber, params.breakoutNumber));
	}, [dispatch, valid, params.meetingNumber, meetingNumber, params.breakoutNumber, breakoutNumber]);

	const close = () => history.push(`${params.groupName}/imatMeetings/${meetingNumber}`);
	const refresh = () => dispatch(loadBreakoutAttendance(meetingNumber, breakoutNumber));

	return (
		<>
			<TopRow style={{maxWidth}}>
				<div>{meeting && renderSessionInfo(meeting)}</div>
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
