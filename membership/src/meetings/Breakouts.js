import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table'
import {ConfirmModal} from 'dot11-components/modals'
import {ActionButton} from 'dot11-components/icons'
import {displayDate, displayTime, displayDayDate} from 'dot11-components/lib'

import {loadBreakouts} from '../store/breakouts'

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

const renderDate = ({rowData}) => displayDayDate(rowData.Start)
const renderTime = ({rowData}) => displayTime(rowData.Start) + ' - ' + displayTime(rowData.End)

const renderGroup = ({rowData}) => {
	const parts = rowData.Group.split('/');
	return parts[parts.length-1]
}

const renderAttendance = ({rowData, dataKey}) =>
	<Link to={`/Session/${rowData.session_id}/Breakout/${rowData.id}/Attendees`}>
		{rowData[dataKey]}
	</Link>

const renderSessionInfo = (meeting) =>
	<div style={{display: 'flex', flexDirection: 'column'}}>
		<span>{meeting.Name}</span>
		<span>{displayDate(meeting.Start) + ' - ' + displayDate(meeting.End)}</span>
		<span>{meeting.TimeZone}</span>
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
	{key: 'Location', 
		label: 'Location',
		width: 250, flexGrow: 1, flexShrink: 1},
	{key: 'Group', 
		label: 'Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderGroup},
	{key: 'Name', 
		label: 'Name',
		width: 150, flexGrow: 1, flexShrink: 1},
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
function breakoutsRowGetter({rowIndex, data}) {
	let b = data[rowIndex];
	if (rowIndex > 0) {
		const b_prev = data[rowIndex - 1];
		if (b.DayDate === b_prev.DayDate) {
			b = {...b, DayDate: ''};
			if (b.StartTime === b_prev.StartTime)
				b = {...b, Time: ''};
		}
	}
	return b;
}

function Breakouts({
	valid,
	loading,
	session,
	loadBreakouts,
	meetingsValid,
	loadMeetings
}) {
	const history = useHistory();
	const {session_id} = useParams();

	React.useEffect(() => {
		if (!valid || session.id != session_id)
			loadBreakouts(session_id);
	}, []);

	const close = () => history.goBack();
	const refresh = () => loadBreakouts(session_id);

	return <>
		<TopRow style={{maxWidth}}>
			<div>{valid && renderSessionInfo(session)}</div>
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

Breakouts.propTypes = {
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	session: PropTypes.object.isRequired,
	loadBreakouts: PropTypes.func.isRequired,
}

const dataSet = 'breakouts'
export default connect(
	(state) => ({
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			session: state[dataSet].session
		}),
	{loadBreakouts}
)(Breakouts)
