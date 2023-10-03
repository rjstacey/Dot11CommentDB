import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
	AppTable, 
	SelectHeaderCell,
	SelectCell,
	TableColumnSelector,
	TableColumnHeader,
	SplitPanelButton,
	SplitPanel,
	Panel,
	ConfirmModal,
	ActionButton,
	displayDateRange,
	HeaderCellRendererProps,
	CellRendererProps,
	ColumnProperties,
	TablesConfig,
	TableConfig
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	fields,
	loadSessions,
	deleteSessions,
	selectSessionsState,
	sessionsSelectors,
	sessionsActions
} from '../store/sessions';

import TopRow from '../components/TopRow';

import SessionDetails from './SessionDetails';

const renderHeaderStartEnd = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='startDate' label='Start' />
		<TableColumnHeader {...props} dataKey='endDate' label='End' />
	</>

export const renderCellStartEnd = ({rowData}: CellRendererProps) => displayDateRange(rowData.startDate, rowData.endDate);

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: (p) =>
			<SelectCell
				selectors={sessionsSelectors}
				actions={sessionsActions}
				{...p}
			/>},
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
	{key: 'number', 
		...fields.number,
		width: 80, flexGrow: 1, flexShrink: 1},
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
	default: ['__ctrl__', 'Start/End', 'number', 'name', 'type', 'groupName', 'timezone', 'Attendance'],
};

let defaultTablesConfig: TablesConfig = {};
let tableView: keyof typeof defaultTablesColumns;
for (tableView in defaultTablesColumns) {
	const tableConfig: TableConfig = {
		fixed: false,
		columns: {}
	}
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith('__'),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width || 200
		}
	}
	defaultTablesConfig[tableView] = tableConfig;
}


function Sessions() {
	const navigate = useNavigate();
	const {groupName} = useParams();
	const dispatch = useAppDispatch();

	const {selected} = useAppSelector(selectSessionsState);

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

	const showSessions = () => navigate(`/${groupName}/imatMeetings`);

	return (
		<>
			<TopRow style={{justifyContent: 'flex-end'}}>
				<div style={{display: 'flex'}}>
					<TableColumnSelector
						selectors={sessionsSelectors}
						actions={sessionsActions}
						columns={tableColumns}
					/>
					<SplitPanelButton
						selectors={sessionsSelectors}
						actions={sessionsActions}
					/>
					<ActionButton name='import' title='Import session' onClick={showSessions} />
					<ActionButton name='delete' title='Remove selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<SplitPanel
				selectors={sessionsSelectors}
				actions={sessionsActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={44}
						estimatedRowHeight={44}
						selectors={sessionsSelectors}
						actions={sessionsActions}
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
