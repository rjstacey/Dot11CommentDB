import PropTypes from 'prop-types'
import React from 'react'
import {Link, useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {ControlHeader, ControlCell, ColumnDropdown} from 'dot11-common/table'
import {ConfirmModal} from 'dot11-common/modals'
import {ActionButton} from 'dot11-common/lib/icons'
import {displayDate} from 'dot11-common/lib/utils'
import {loadAttendees, importSelectedAttendees} from '../store/attendees'
import {renderNameAndEmail} from '../members/Members'

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	width: 100%;
	align-items: center;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const renderSessionInfo = (meeting) =>
	<div>
		<span>{meeting.Name}</span><br />
		<span>{displayDate(meeting.Start) + ' - ' + displayDate(meeting.End)}</span><br />
		<span>{meeting.TimeZone}</span>
	</div>

const AttendeesColumnDropdown = (props) => <ColumnDropdown dataSet={dataSet} {...props}/>;

const renderHeaderNameAndEmail = (props) =>
	<React.Fragment>
		<AttendeesColumnDropdown {...props} dataKey='Name' label='Name' />
		<AttendeesColumnDropdown {...props} dataKey='Email' label='Email' />
	</React.Fragment>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />},
	{key: 'SAPIN', 
		label: 'SA PIN',
		width: 80, flexGrow: 1, flexShrink: 1},
	{key: 'Name', 
		label: 'Name',
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail},
	{key: 'Affiliation', 
		label: 'Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status', 
		label: 'Status',
		width: 150, flexGrow: 1, flexShrink: 1}
];

const primaryDataKey = 'SAPIN';

function renderTitle(meeting, breakout) {
	return (
		<React.Fragment>
			<div>
				<span>{meeting.Name}</span><br />
				<span>{displayDate(meeting.Start) + ' - ' + displayDate(meeting.End)}</span><br />
				<span>{'Time zone: ' + meeting.TimeZone}</span>
			</div>
			<div>
				<span>{breakout && breakout.Name}</span>
			</div>
		</React.Fragment>
	)
}

function Attendees({
	valid,
	loading,
	session,
	breakout,
	loadAttendees,
	importSelectedAttendees
}) {
	const history = useHistory();
	const {session_id, breakout_id} = useParams();

	React.useEffect(() => {
		if (!valid || session.id !== session_id || breakout.id !== breakout_id)
			loadAttendees(session_id, breakout_id)
	}, []);

	const {columns, maxWidth} = React.useMemo(() => {
		let columns = tableColumns;
		if (!breakout_id) {
			const dataRenderer = (pct) => !isNaN(pct)? `${pct.toFixed(2)}%`: '';
			columns = columns.concat(
				{key: 'AttendancePercentage', 
					label: 'Attendance',
					width: 150, flexGrow: 1, flexShrink: 1,
					dataRenderer,
					cellRenderer: ({rowData, dataKey}) => dataRenderer(rowData[dataKey])}
			)
		}
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);
		return {columns, maxWidth};
	}, [breakout_id], session);

	const handleImportAttandees = async () => {
		const ok = await ConfirmModal.show('Import selected to members list?');
		if (ok)
			importSelectedAttendees();
	}
	const refresh = () => loadAttendees(session_id, breakout_id);
	const close = () => history.goBack();

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				{valid? renderTitle(session, breakout): null}
				<div>
					<ActionButton name='import' title='Add Selected' onClick={handleImportAttandees} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					<ActionButton name='close' title='Close' onClick={close} />
				</div>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					fixed
					columns={columns}
					headerHeight={40}
					estimatedRowHeight={50}
					dataSet={dataSet}
					rowKey={primaryDataKey}
				/>
			</TableRow>
		</React.Fragment>
	)
}

Attendees.propTypes = {
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	session: PropTypes.object.isRequired,
	breakout: PropTypes.object,
	loadAttendees: PropTypes.func.isRequired,
	importSelectedAttendees: PropTypes.func.isRequired,
}

const dataSet = 'attendees'
export default connect(
	(state) => ({
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			session: state[dataSet].session,
			breakout: state[dataSet].breakout,
		}),
	{loadAttendees, importSelectedAttendees}
)(Attendees)
