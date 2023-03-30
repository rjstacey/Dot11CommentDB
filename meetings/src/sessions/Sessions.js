import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';

import AppTable, {SelectHeader, SelectCell, TableColumnSelector, TableColumnHeader, SplitPanelButton, SplitPanel, Panel} from 'dot11-components/table';
import {ConfirmModal} from 'dot11-components/modals';
import {ActionButton} from 'dot11-components/form';
import {displayDateRange} from 'dot11-components/lib';
import SessionDetails from './SessionDetails';

import PathGroupSelector from '../components/PathGroupSelector';
import TopRow from '../components/TopRow';

import {
	fields,
	loadSessions,
	deleteSessions,
	selectSessionsState,
	dataSet
} from '../store/sessions';

const SessionsColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;

const renderHeaderStartEnd = (props) =>
	<>
		<SessionsColumnHeader {...props} dataKey='startDate' label='Start' />
		<SessionsColumnHeader {...props} dataKey='endDate' label='End' />
	</>

export const renderCellStartEnd = ({rowData}) => displayDateRange(rowData.startDate, rowData.endDate);

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'id', 
		...fields.id,
		width: 60, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'startDate', 
		...fields.startDate,
		width: 120, flexGrow: 1, flexShrink: 1},
	{key: 'endDate', 
		...fields.endDate,
		width: 120, flexGrow: 1, flexShrink: 1},
	{key: 'Start/End', 
		label: 'Start/End',
		width: 120, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderStartEnd,
		cellRenderer: renderCellStartEnd},
	{key: 'name', 
		...fields.name,
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'type', 
		...fields.type,
		width: 80, flexGrow: 1, flexShrink: 1},
	{key: 'groupName', 
		...fields.groupName,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'timezone', 
		...fields.timezone,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'imatMeetingId', 
		...fields.imatMeetingId,
		width: 120, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'Start/End', 'name', 'type', 'groupName', 'timezone', 'Breakouts', 'Attendance'],
};

const defaultTablesConfig = {};

for (const tableView of Object.keys(defaultTablesColumns)) {
	const tableConfig = {
		fixed: false,
		columns: {}
	}
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith('__'),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width
		}
	}
	defaultTablesConfig[tableView] = tableConfig;
}

function Sessions() {
	const navigate = useNavigate();
	const dispatch = useDispatch();

	const {selected} = useSelector(selectSessionsState);

	React.useEffect(() => {
		dispatch(loadSessions());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => dispatch(loadSessions());

	const handleRemoveSelected = async () => {
		if (selected.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + selected.join(', ') + '?');
			if (ok)
				await dispatch(deleteSessions(selected));
		}
	}

	const showSessions = () => navigate('/sessions/imat');

	return (
		<>
			<TopRow>
				<PathGroupSelector/>
				<div style={{display: 'flex'}}>
					<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
					<SplitPanelButton dataSet={dataSet} />
					<ActionButton name='import' title='Import session' onClick={showSessions} />
					<ActionButton name='delete' title='Remove selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<SplitPanel dataSet={dataSet} >
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={44}
						estimatedRowHeight={44}
						dataSet={dataSet}
					/>
				</Panel>
				<Panel style={{overflow: 'auto'}}>
					<SessionDetails />
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Sessions;
