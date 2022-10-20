import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {Link, useHistory, useParams} from 'react-router-dom';

import AppTable, {SelectHeader, SelectCell, TableColumnSelector, TableColumnHeader, SplitPanel, Panel} from 'dot11-components/table';
import {ConfirmModal} from 'dot11-components/modals';
import {ActionButton, Button} from 'dot11-components/form';
import {displayDateRange} from 'dot11-components/lib';
import SessionDetail from './SessionDialog';

import {
	fields,
	loadSessions,
	deleteSessions,
	setSessionsUiProperty,
	SessionTypeOptions,
	selectSessionsState,
	selectSessionsCurrentPanelConfig,
	setSessionsCurrentPanelIsSplit,
	dataSet
} from '../store/sessions';

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

const SessionsColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;

const renderHeaderStartEnd = (props) =>
	<>
		<SessionsColumnHeader {...props} dataKey='startDate' label='Start' />
		<SessionsColumnHeader {...props} dataKey='endDate' label='End' />
	</>

export const renderCellStartEnd = ({rowData}) => displayDateRange(rowData.startDate, rowData.endDate);

const renderMeetingType = ({rowData}) => {
	const option = SessionTypeOptions.find(o => o.value === rowData.type)
	return option? option.label: '';
};

const renderBreakouts = ({rowData, dataKey}) =>
	<Link to={`/sessions/${rowData.id}/breakouts`}>
		{rowData[dataKey]}
	</Link>

const renderAttendance = ({rowData, dataKey}) =>
	<Link to={`/sessions/${rowData.id}/attendees`}>
		{rowData[dataKey]}
	</Link>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'id', 
		...fields.id,
		width: 60, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'imatMeetingId', 
		...fields.imatMeetingId,
		width: 120, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
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
	{key: 'timezone', 
		...fields.timezone,
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
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'Start/End', 'name', 'type', 'timezone', 'Breakouts', 'Attendance'],
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

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40;

function Sessions() {
	const history = useHistory();
	const dispatch = useDispatch();

	const {valid, loading, selected} = useSelector(selectSessionsState);
	const {isSplit} = useSelector(selectSessionsCurrentPanelConfig);
	const setIsSplit = React.useCallback((value) => dispatch(setSessionsCurrentPanelIsSplit(value)), [dispatch]);

	React.useEffect(() => {
		if (!valid)
			dispatch(loadSessions());
	}, []);

	const refresh = () => dispatch(loadSessions());

	const handleRemoveSelected = async () => {
		if (selected.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + selected.join(', ') + '?');
			if (ok)
				await dispatch(deleteSessions(selected));
		}
	}

	const showSessions = () => history.push('/sessions/imat');

	return (
		<>
		<TopRow style={{maxWidth}}>
			<div>Sessions</div>
			<div style={{display: 'flex'}}>
				<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
				<ActionButton
					name='book-open'
					title='Show detail'
					isActive={isSplit}
					onClick={() => setIsSplit(!isSplit)}
				/>
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
					headerHeight={36}
					estimatedRowHeight={44}
					dataSet={dataSet}
				/>
			</Panel>
			<Panel style={{overflow: 'auto'}}>
				<SessionDetail
					key={selected}
				/>
			</Panel>
		</SplitPanel>
		</>
	)
}

export default Sessions;
