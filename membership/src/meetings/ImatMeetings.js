import PropTypes from 'prop-types'
import React from 'react'
import {useHistory} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {ControlHeader, ControlCell} from 'dot11-common/table'
import {ConfirmModal} from 'dot11-common/modals'
import {ActionButton} from 'dot11-common/lib/icons'
import {displayDate} from 'dot11-common/lib/utils'
import SessionDialog from './SessionDialog'

import {loadImatMeetings, getSyncedImatMeetingsEntities} from '../store/imatMeetings'
import {loadSessions, MeetingTypeOptions} from '../store/sessions'

const DefaultMeeting = {Date: new Date(), Location: '', Type: MeetingTypeOptions[0].value}

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
	</ActionCell>

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

const renderMeetingType = ({rowData}) => {
	const option = MeetingTypeOptions.find(o => o.value === rowData.Type)
	return option? option.label: '';
};

const renderDate = ({rowData, dataKey}) => displayDate(rowData[dataKey])

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />},
	{key: 'MeetingNumber', 
		label: 'Meeting Number',
		width: 120, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'Start', 
		label: 'Start',
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderDate},
	{key: 'End', 
		label: 'End',
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderDate},
	{key: 'Name', 
		label: 'Session Name',
		width: 400, flexGrow: 1, flexShrink: 1},
	{key: 'Type', 
		label: 'Session Type',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderMeetingType},
	{key: 'TimeZone', 
		label: 'Time Zone',
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Actions',
		label: 'Actions',
		width: 200, flexGrow: 1, flexShrink: 1}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0);
const primaryDataKey = 'MeetingNumber';

function ImatMeetings({
	selected,
	valid,
	loading,
	imatMeetings,
	loadImatMeetings,
	sessionsValid,
	loadSessions
}) {
	const history = useHistory();
	const [sessionDialog, setSessionDialog] = React.useState({action: null});
	const numberSessions = React.useRef(20);

	const columns = React.useMemo(() => {

		const renderActions = ({rowData}) => 
			(rowData.InDatabase)
				? <span>Already Present</span>
				: <ActionButton name='import' title='Import' onClick={() => importSessionDialog(rowData)} />

		return tableColumns.map(col => col.key === 'Actions'? {...col, cellRenderer: renderActions}: col);

	}, []);

	React.useEffect(() => {
		if (!sessionsValid)
			loadSessions()
		if (!valid)
			loadImatMeetings(numberSessions.current)
	}, []);

	const importSessionDialog = (meeting) => setSessionDialog({action: 'add', meeting});
	const closeSessionDialog = () => setSessionDialog(s => ({...s, action: null}));

	function getMore() {
		numberSessions.current += 10;
		loadImatMeetings(numberSessions.current)
	}

	const close = () => history.goBack();
	const refresh = () => loadImatMeetings(numberSessions.current);

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<div>IMAT Session</div>
				<div>
					<ActionButton name='more' title='Load More' onClick={getMore} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					<ActionButton name='close' title='Close' onClick={close} />
				</div>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
					dataSet={dataSet}
					rowGetter={({rowId}) => imatMeetings[rowId]}
					rowKey={primaryDataKey}
				/>
			</TableRow>

			<SessionDialog
				isOpen={!!sessionDialog.action}
				action={sessionDialog.action}
				meeting={sessionDialog.meeting}
				close={closeSessionDialog}
			/>
		</React.Fragment>
	)
}

ImatMeetings.propTypes = {
	selected: PropTypes.array.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	imatMeetings:  PropTypes.object.isRequired,
	loadImatMeetings: PropTypes.func.isRequired,
	sessionsValid: PropTypes.bool.isRequired,
	loadSessions: PropTypes.func.isRequired,
}

const dataSet = 'imatMeetings'
export default connect(
	(state) => ({
			selected: state[dataSet].selected,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			imatMeetings: getSyncedImatMeetingsEntities(state),
			sessionsValid: state['sessions'].valid
		}),
	{loadImatMeetings, loadSessions}
)(ImatMeetings)
