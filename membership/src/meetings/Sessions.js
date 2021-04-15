import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Link, useHistory, useParams} from "react-router-dom"
import AppTable, {ControlHeader, ControlCell} from 'dot11-common/table'
import {ConfirmModal} from 'dot11-common/modals'
import {ActionButton} from 'dot11-common/lib/icons'
import {displayDate} from 'dot11-common/lib/utils'
import SessionDialog from './SessionDialog'

import {getSortedFilteredData} from 'dot11-common/store/dataSelectors'
import {loadSessions, deleteSessions, MeetingTypeOptions} from '../store/sessions'
import {importBreakouts} from '../store/breakouts'
import {importAttendances} from '../store/attendees'

const DefaultSession = {Date: new Date(), Location: '', Type: MeetingTypeOptions[0].value}

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete, onImport}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
		<ActionButton name='edit' title='Import breakouts' onClick={onImport} />
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

const renderBreakouts = ({rowData, dataKey}) =>
	<Link to={`/Session/${rowData.id}/Breakouts`}>
		{rowData[dataKey]}
	</Link>

const renderAttendance = ({rowData, dataKey}) =>
	<Link to={`/Session/${rowData.id}/Attendees`}>
		{rowData[dataKey]}
	</Link>

const renderDate = ({rowData, dataKey}) => displayDate(rowData[dataKey])

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />},
	{key: 'id', 
		label: 'ID',
		width: 60, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'MeetingNumber', 
		label: 'Meeting Number',
		width: 120, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'Start', 
		label: 'Start',
		width: 120, flexGrow: 1, flexShrink: 1,
		dataRenderer: displayDate,
		cellRenderer: renderDate},
	{key: 'End', 
		label: 'End',
		width: 120, flexGrow: 1, flexShrink: 1,
		dataRenderer: displayDate,
		cellRenderer: renderDate},
	{key: 'Name', 
		label: 'Session Name',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Type', 
		label: 'Session Type',
		width: 80, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderMeetingType},
	{key: 'TimeZone', 
		label: 'Time Zone',
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Breakouts', 
		label: 'Breakouts',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderBreakouts},
	{key: 'TotalCredit', 
		label: 'Credits',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'Attendees', 
		label: 'Attendance',
		width: 100, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderAttendance},
	{key: 'Actions',
		label: 'Actions',
		width: 100, flexGrow: 1, flexShrink: 1}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40;
const primaryDataKey = 'id';

function Sessions({
	selected,
	valid,
	loading,
	loadSessions,
	deleteSessions,
	importBreakouts,
	importAttendances
}) {
	const [sessionDialog, setSessionDialog] = React.useState({action: ''});
	const history = useHistory();

	const columns = React.useMemo(() => {
		
		const onDelete = async (meeting) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${meeting.id}?`)
			if (ok)
				deleteSessions([meeting.id])
		}

		return tableColumns.map(col => {
			if (col.key === 'Actions')
				return {
					...col,
					cellRenderer: ({rowData}) => 
						<RowActions
							onEdit={() => setSessionDialog({action: 'update', session: rowData})}
							onDelete={() => onDelete(rowData)}
							onImport={() => importAttendances(rowData.id)}
						/>
				}
			else
				return col
		});

	}, []);

	React.useEffect(() => {
		if (!valid)
			loadSessions()
	}, []);

	const handleRemoveSelected = async () => {
		if (selected.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + selected.join(', ') + '?')
			if (ok)
				await deleteSessions(selected)
		}
	}

	const addSessionDialog = () => setSessionDialog({action: 'add', session: DefaultSession})
	const closeSessionDialog = () => setSessionDialog(s => ({...s, action: ''}))
	const showSessions = () => history.push('/ImatSessions/');

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<div>Sessions</div>
				<div>
					<ActionButton name='import' title='Import session' onClick={showSessions} />
					<ActionButton name='add' title='Add User' onClick={addSessionDialog} />
					<ActionButton name='delete' title='Remove Selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='refresh' title='Refresh' onClick={loadSessions} />
				</div>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
					dataSet={dataSet}
					rowKey={primaryDataKey}
				/>
			</TableRow>

			<SessionDialog
				isOpen={!!sessionDialog.action}
				action={sessionDialog.action}
				session={sessionDialog.session}
				close={closeSessionDialog}
			/>
		</React.Fragment>
	)
}

Sessions.propTypes = {
	selected: PropTypes.array.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	loadSessions: PropTypes.func.isRequired,
	deleteSessions: PropTypes.func.isRequired
}

const dataSet = 'sessions'
export default connect(
	(state) => ({
			selected: state[dataSet].selected,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
		}),
	{loadSessions, deleteSessions, importBreakouts, importAttendances}
)(Sessions)
