import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';

import {load802WorldSchedule, select802WorldScheduleState, fields, dataSet} from '../store/ieee802WorldSchedule';

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

const columns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'breakoutDate', 
		...fields.breakoutDate,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'startTime', 
		...fields.startTime,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'endTime', 
		...fields.endTime,
		width: 100, flexGrow: 1, flexShrink: 1, dropdownWidth: 300},
	{key: 'meeting', 
		...fields.meeting,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'mtgLocation', 
		...fields.mtgLocation,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'groupName', 
		...fields.groupName,
		width: 200, flexGrow: 1, flexShrink: 1},
];

const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);

function Ieee802WorldSchedule() {
	const dispatch = useDispatch();
	const {valid} = useSelector(select802WorldScheduleState);

	React.useEffect(() => {
		if (!valid)
			dispatch(load802WorldSchedule());
	}, [valid, dispatch]);

	const refresh = () => dispatch(load802WorldSchedule());

	return (
		<>
			<TopRow style={{maxWidth}}>
				<div>802 World Schedule</div>
				<div>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
					dataSet={dataSet}
				/>
			</TableRow>
		</>
	)
}

export default Ieee802WorldSchedule;
