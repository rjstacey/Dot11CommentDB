import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {
	AppTable, SelectHeaderCell, SelectCell,
	ActionButton,
	ColumnProperties
} from 'dot11-components';

import {
	loadImatMeetingAttendance,
	clearImatMeetingAttendance,
	selectMeetingAttendanceState,
	selectImatMeeting,
	imatMeetingAttendanceSelectors,
	imatMeetingAttendanceActions
 } from '../store/imatMeetingAttendance';

import TopRow from '../components/TopRow';

import { ImatMeetingInfo } from './ImatBreakouts';

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

type ColumnPropertiesWithWidth = ColumnProperties & {width: number};

const columns: ColumnPropertiesWithWidth[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: p =>
			<SelectCell 
				selectors={imatMeetingAttendanceSelectors}
				actions={imatMeetingAttendanceActions}
				{...p}
			/>},
	{key: 'breakoutId',
		label: 'Breakout',
		width: 150, flexGrow: 1, flexShrink: 1},
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
	const {valid, imatMeetingId} = useAppSelector(selectMeetingAttendanceState);
	const imatMeeting = useAppSelector(selectImatMeeting);

	React.useEffect(() => {
		if (!valid ||
			(meetingNumber && meetingNumber !== imatMeetingId))
			dispatch(loadImatMeetingAttendance(meetingNumber));
	}, [dispatch, valid, meetingNumber, imatMeetingId, breakoutNumber]);

	const close = () => navigate(-1);
	const refresh = () => imatMeetingId? dispatch(loadImatMeetingAttendance(imatMeetingId)): dispatch(clearImatMeetingAttendance());

	return (
		<>
			<TopRow style={{maxWidth}}>
				<ImatMeetingInfo imatMeeting={imatMeeting} />
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
					selectors={imatMeetingAttendanceSelectors}
					actions={imatMeetingAttendanceActions}
				/>
			</TableRow>
		</>
	)
}

export default BreakoutAttendance;
