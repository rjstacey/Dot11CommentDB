import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {ActionButton, ButtonGroup} from 'dot11-components/form';
import AppTable, {SplitPanel, Panel, SelectHeader, SelectCell, ShowFilters, TableColumnSelector, TableViewSelector} from 'dot11-components/table';

import {fields, loadTelecons, setUiProperty, dataSet} from './store/telecons';
import {setTimezone, dataSet as timeZoneDataSet} from './store/timeZones';
import TeleconDetail from './TeleconDetail';
import ShowCalendar from './ShowCalendar';
import TimeZoneSelector from './TimeZoneSelector';

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
	...fields.group,
		width: 80, flexGrow: 1, flexShrink: 0},
	{key: 'subgroup',
		label: 'Subgroup',
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'day',
		...fields.day,
		width: 60, flexGrow: 1, flexShrink: 0},
	{key: 'date',
		...fields.date,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'time',
		...fields.time,
		width: 70, flexGrow: 1, flexShrink: 0},
	{key: 'duration',
		...fields.duration,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'hasMotions',
		...fields.hasMotions,
		width: 90, flexGrow: 1, flexShrink: 0}
];

function Telecons() {

	const dispatch = useDispatch();
	const {valid, loading, ui: uiProperties} = useSelector(state => state[dataSet]);
	const setProperty = React.useCallback((property, value) => dispatch(setUiProperty({property, value})), [dispatch]);
	const {timeZone} = useSelector(state => state[timeZoneDataSet]);

	React.useEffect(() => {
		if (!valid && !loading)
			dispatch(loadTelecons(group));
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const refresh = () => dispatch(loadTelecons(group));

	return <>
		<TopRow>
			<ShowCalendar group={group} />
		</TopRow>
		<TopRow>
			<TimeZoneSelector
				style={{width: 200}}
				value={timeZone}
				onChange={(tz) => dispatch(setTimezone(tz))}
			/>
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
					headerHeight={32}
					estimatedRowHeight={32}
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
