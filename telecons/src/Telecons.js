import React from 'react'
import {useDispatch, useSelector} from 'react-redux'
import styled from '@emotion/styled'
import {ActionButton, ButtonGroup} from 'dot11-components/icons'
import AppTable, {SplitPanel, Panel, SelectHeader, SelectCell, ShowFilters, TableColumnSelector, TableViewSelector} from 'dot11-components/table'
import {fields, loadTelecons, setUiProperty, dataSet} from './store/telecons'
import TeleconDetail from './TeleconDetail'
import {DateTime} from 'luxon'

const group = '802.11';

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'group',
		label: 'Group',
		width: 200, flexGrow: 1, flexShrink: 0},
	{key: 'subgroup',
		label: 'Subgroup',
		width: 200, flexGrow: 1, flexShrink: 0},
	{key: 'Day',
		label: 'Day',
		width: 200, flexGrow: 1, flexShrink: 0,
		cellRenderer: ({rowData, dataKey}) => DateTime.fromISO(rowData.start).weekdayShort},
	{key: 'Date',
		label: 'Date',
		width: 200, flexGrow: 1, flexShrink: 0,
		cellRenderer: ({rowData, dataKey}) => DateTime.fromISO(rowData.start).toFormat('yyyy LLL dd')},
	{key: 'Time',
		label: 'Time',
		width: 200, flexGrow: 1, flexShrink: 0,
		cellRenderer: ({rowData, dataKey}) => DateTime.fromISO(rowData.start).toFormat('HH:mm')},
	{key: 'Duration',
		label: 'Duration',
		width: 200, flexGrow: 1, flexShrink: 0,
		cellRenderer: ({rowData, dataKey}) => DateTime.fromISO(rowData.end).diff(DateTime.fromISO(rowData.start), 'hours').hours},
	{key: 'hasMotions',
		label: 'Motions',
		width: 40, flexGrow: 1, flexShrink: 0}
];

function Telecons() {

	const dispatch = useDispatch();
	const {loading, ui: uiProperties} = useSelector(state => state[dataSet]);
	const setProperty = React.useCallback((property, value) => dispatch(setUiProperty({property, value})), [dispatch]);

	React.useEffect(() => {
		if (!loading)
			dispatch(loadTelecons(group));
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => dispatch(loadTelecons(group));

	return <>
		<TopRow>
			<div style={{display: 'flex', alignItems: 'center'}}>
				<ButtonGroup>
					<div style={{textAlign: 'center'}}>Table view</div>
					<div style={{display: 'flex', alignItems: 'center'}}>
						<TableViewSelector dataSet={dataSet} />
						<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
						<ActionButton
							name='book-open'
							title='Show detail'
							isActive={uiProperties.showDetail} 
							onClick={() => setProperty('showDetail', !uiProperties.showDetail)} 
						/>
					</div>
				</ButtonGroup>
				<ActionButton name='refresh' title='Refresh' onClick={refresh} />
			</div>
		</TopRow>

		<ShowFilters
			dataSet={dataSet}
			fields={fields}
		/>

		<SplitPanel splitView={uiProperties.showDetail || false} >
			<Panel>
				<AppTable
					columns={tableColumns}
					headerHeight={62}
					estimatedRowHeight={64}
					dataSet={dataSet}
				/>
			</Panel>
			<Panel>
				<TeleconDetail />
			</Panel>
		</SplitPanel>
	</>
}

export default Telecons;
