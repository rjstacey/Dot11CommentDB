import React from 'react';
import {Link, useHistory, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';
import {displayDate} from 'dot11-components/lib';

import {loadBreakouts, selectBreakoutsState, getField, dataSet} from '../store/breakouts';

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

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

const renderGroup = ({rowData}) => {
	const parts = rowData.Group.split('/');
	return parts[parts.length-1]
}

const renderAttendance = ({rowData, dataKey}) =>
	<Link to={`/sessions/${rowData.session_id}/breakout/${rowData.id}/attendees`}>
		{rowData[dataKey]}
	</Link>

const renderSessionInfo = (meeting) =>
	<div style={{display: 'flex', flexDirection: 'column'}}>
		<span>{meeting.name}</span>
		<span>{displayDate(meeting.startDate) + ' - ' + displayDate(meeting.endDate)}</span>
		<span>{meeting.timezone}</span>
	</div>

const columns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'DayDate', 
		label: 'Date',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'Time',
		label: 'Time',
		width: 120, flexGrow: 1, flexShrink: 1},
	{key: 'Group', 
		label: 'Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderGroup},
	{key: 'Name', 
		label: 'Name',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'Location', 
		label: 'Location',
		width: 250, flexGrow: 1, flexShrink: 1},
	{key: 'Credit', 
		label: 'Credit',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'Attendees', 
		label: 'Attendance',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderAttendance}
];

const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);

/*
 * Don't display Data and Time if it is the same as previous line
 */
function breakoutsRowGetter({rowIndex, ids, entities}) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		DayDate: getField(b, 'DayDate'),
		Time: getField(b, 'Time')
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]];
		b_prev = {
			...b_prev,
			DayDate: getField(b_prev, 'DayDate'),
			Time: getField(b_prev, 'Time')
		};
		if (b.DayDate === b_prev.DayDate) {
			b = {...b, DayDate: ''};
			if (b.Time === b_prev.Time)
				b = {...b, Time: ''};
		}
	}
	return b;
}

function Breakouts() {
	const history = useHistory();
	const {session_id} = useParams();

	const dispatch = useDispatch();
	const {valid, session} = useSelector(selectBreakoutsState);

	React.useEffect(() => {
		if (!valid || (session && session.id != session_id))
			dispatch(loadBreakouts(session_id));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const close = () => history.goBack();
	const refresh = () => dispatch(loadBreakouts(session_id));

	return <>
		<TopRow style={{maxWidth}}>
			<div>{session && renderSessionInfo(session)}</div>
			<div>Breakouts</div>
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
				rowGetter={breakoutsRowGetter}
			/>
		</TableRow>
	</>
}

export default Breakouts;
