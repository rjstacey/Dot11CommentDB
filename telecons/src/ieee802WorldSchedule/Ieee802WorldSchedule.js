import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable, {SelectHeader, SelectCell, TableColumnSelector, TableColumnHeader} from 'dot11-components/table';

import {ActionButton, ButtonGroup} from 'dot11-components/form';
import {ConfirmModal} from 'dot11-components/modals';

import {load802WorldSchedule, importSelectedAsTelecons, select802WorldScheduleState, fields, getField, dataSet} from '../store/ieee802WorldSchedule';

import GroupPathSelector from '../components/GroupPathSelector';
import CurrentSessionSelector from '../components/CurrentSessionSelector';
import TopRow from '../components/TopRow';

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	width: 100%;
	align-items: center;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const ColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;

const renderDateHeader = (props) =>
	<>
		<ColumnHeader {...props} dataKey='day' label='Day' />
		<ColumnHeader {...props} dataKey='date' label='Date' />
	</>

const renderTimeRangeHeader = (props) =>
	<>
		<ColumnHeader {...props} dataKey='startTime' label='Start time' />
		<ColumnHeader {...props} dataKey='endTime' label='End time' />
	</>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
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
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'dayDate', 'timeRange', 'groupName', 'meeting', 'mtgRoom'],
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

/*
 * Don't display date and time if it is the same as previous line
 */
function schedRowGetter({rowIndex, ids, entities}) {
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
	const dispatch = useDispatch();
	const {valid} = useSelector(select802WorldScheduleState);


	React.useEffect(() => {
		if (!valid)
			dispatch(load802WorldSchedule());
	}, [valid, dispatch]);

	const refresh = () => dispatch(load802WorldSchedule());

	const importSelected = async () => {
		const ok = await ConfirmModal.show('Import selected?');
		if (ok)
			dispatch(importSelectedAsTelecons());
	}

	return (
		<>
			<TopRow>
				<GroupPathSelector />
				<CurrentSessionSelector />
				<ButtonGroup>
					<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
					<ActionButton name='import' title='Import selected' onClick={importSelected} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</ButtonGroup>
			</TopRow>

			<TableRow>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={46}
					estimatedRowHeight={36}
					dataSet={dataSet}
					rowGetter={schedRowGetter}
				/>
			</TableRow>
		</>
	)
}

export default Ieee802WorldSchedule;
