import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {
	AppTable, SelectHeaderCell, SelectCell,
	ActionButton,
	displayDayDate, displayTime, ColumnProperties
} from 'dot11-components';

import {
	loadBreakoutAttendance,
	selectBreakoutAttendanceState,
	selectImatMeeting,
	selectImatBreakout,
	imatBreakoutAttendanceSelectors,
	imatBreakoutAttendanceActions
 } from '../store/imatBreakoutAttendance';

import type { Breakout } from '../store/imatBreakouts';

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

export const renderBreakoutInfo = (breakout: Breakout) =>
	<div style={{display: 'flex', flexDirection: 'column'}}>
		<span>{breakout.name}</span>
		<span>{displayDayDate(breakout.start)}</span>
		<span>{displayTime(breakout.start) + ' - ' + displayTime(breakout.end)}</span>
		<span>{breakout.location}</span>
	</div>
	
type ColumnPropertiesWithWidth = ColumnProperties & {width: number};

const columns: ColumnPropertiesWithWidth[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: p =>
			<SelectCell 
				selectors={imatBreakoutAttendanceSelectors}
				actions={imatBreakoutAttendanceActions}
				{...p}
			/>},
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
	const meetingNumber = Number(params.meetingNumber);
	const breakoutNumber = Number(params.breakoutNumber);

	const dispatch = useAppDispatch();
	const {valid, imatMeetingId, imatBreakoutId} = useAppSelector(selectBreakoutAttendanceState);
	const imatMeeting = useAppSelector(selectImatMeeting);
	const breakout = useAppSelector(selectImatBreakout);

	React.useEffect(() => {
		if (!valid ||
			(meetingNumber && meetingNumber !== imatMeetingId) ||
			(breakoutNumber && breakoutNumber !== imatBreakoutId))
			dispatch(loadBreakoutAttendance(meetingNumber, breakoutNumber));
	}, [dispatch, valid, meetingNumber, imatMeetingId, breakoutNumber, imatBreakoutId]);

	const close = () => navigate(-1);
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
					selectors={imatBreakoutAttendanceSelectors}
					actions={imatBreakoutAttendanceActions}
				/>
			</TableRow>
		</>
	)
}

export default BreakoutAttendance;
