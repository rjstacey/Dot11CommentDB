import React from 'react';
import styled from '@emotion/styled';

import {
	AppTable, 
	SelectHeaderCell,
	SelectCell,
	TableColumnSelector,
	TableColumnHeader,
	ActionButton,
	ConfirmModal,
	ColumnProperties,
	TableConfig,
	TablesConfig,
	HeaderCellRendererProps
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	load802WorldSchedule,
	importSelectedAsMeetings,
	select802WorldState,
	fields,
	getField,
	ieee802WorldSelectors,
	ieee802WorldActions
} from '../store/ieee802World';

import TopRow from '../components/TopRow';
import MeetingSummary from '../components/MeetingSummary';

import { RowGetterProps } from 'dot11-components/dist/table/AppTable';

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	width: 100%;
	align-items: center;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const renderDateHeader = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='day' label='Day' />
		<TableColumnHeader {...props} dataKey='date' label='Date' />
	</>

const renderTimeRangeHeader = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='startTime' label='Start time' />
		<TableColumnHeader {...props} dataKey='endTime' label='End time' />
	</>

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: p =>
			<SelectCell
				selectors={ieee802WorldSelectors}
				actions={ieee802WorldActions}
				{...p}
			/>},
	{key: 'day',
		...fields.day,
		width: 60, flexGrow: 1, flexShrink: 0},
	{key: 'dayDate',
		...fields.dayDate,
		width: 100, flexGrow: 1, flexShrink: 0,
		headerRenderer: renderDateHeader},
	{key: 'timeRange',
		...fields.timeRange,
		width: 70, flexGrow: 1, flexShrink: 0,
		headerRenderer: renderTimeRangeHeader},
	{key: 'startTime', 
		...fields.startTime,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'endTime', 
		...fields.endTime,
		width: 100, flexGrow: 1, flexShrink: 1, dropdownWidth: 300},
	{key: 'groupName', 
		...fields.groupName,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'meeting', 
		...fields.meeting,
		width: 400, flexGrow: 1, flexShrink: 1},
	{key: 'mtgRoom', 
		...fields.mtgRoom,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'mtgLocation', 
		...fields.mtgLocation,
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'meetingId',
		label: 'Compare meeting',
		width: 200, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData}) => <MeetingSummary meetingId={rowData.meetingId} />}
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'dayDate', 'timeRange', 'groupName', 'meeting', 'mtgRoom'],
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

/*
 * Don't display date and time if it is the same as previous line
 */
function schedRowGetter({rowIndex, ids, entities}: RowGetterProps) {
	let b = entities[ids[rowIndex]];
	b = {
		...b,
		dayDate: getField(b, 'dayDate'),
		timeRange: getField(b, 'timeRange')
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]];
		if (b.dayDate === getField(b_prev, 'dayDate')) {
			b = {...b, dayDate: ''};
			if (b.timeRange === getField(b_prev, 'timeRange'))
				b = {...b, timeRange: ''};
		}
	}
	return b;
}

function Ieee802WorldSchedule() {
	const dispatch = useAppDispatch();
	const {valid} = useAppSelector(select802WorldState);

	React.useEffect(() => {
		if (!valid)
			dispatch(load802WorldSchedule());
	}, [valid, dispatch]);

	const refresh = () => dispatch(load802WorldSchedule());

	const importSelected = async () => {
		const ok = await ConfirmModal.show('Import selected?');
		if (ok)
			dispatch(importSelectedAsMeetings());
	}

	return (
		<>
			<TopRow style={{justifyContent: 'flex-end'}}>
				<TableColumnSelector
					selectors={ieee802WorldSelectors}
					actions={ieee802WorldActions}
					columns={tableColumns}
				/>
				<ActionButton name='import' title='Import selected' onClick={importSelected} />
				<ActionButton name='refresh' title='Refresh' onClick={refresh} />
			</TopRow>

			<TableRow>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={46}
					estimatedRowHeight={36}
					selectors={ieee802WorldSelectors}
					actions={ieee802WorldActions}
					rowGetter={schedRowGetter}
				/>
			</TableRow>
		</>
	)
}

export default Ieee802WorldSchedule;
