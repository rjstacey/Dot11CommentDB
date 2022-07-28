import React from 'react';
import {Link, useHistory} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import AppTable, {SelectHeader, SelectCell} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';

import {
	loadImatMeetings,
	selectImatMeetingsState,
	fields,
	dataSet
} from '../store/imatMeetings';

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

const renderBreakoutsLink = ({rowData}) => <Link to={`/imatMeetings/${rowData.id}`}>view breakouts</Link>

const columns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'start', 
		...fields.start,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'end', 
		...fields.end,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'name', 
		...fields.name,
		width: 400, flexGrow: 1, flexShrink: 1, dropdownWidth: 300},
	{key: 'type', 
		...fields.type,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'timezone', 
		...fields.timezone,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Actions',
		label: '',
		width: 200, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderBreakoutsLink}
];

const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);

function ImatMeetings() {
	const history = useHistory();
	const dispatch = useDispatch();
	const {valid} = useSelector(selectImatMeetingsState);

	React.useEffect(() => {
		if (!valid)
			dispatch(loadImatMeetings());
	}, [valid, dispatch]);

	const close = () => history.push('/sessions');
	const refresh = () => dispatch(loadImatMeetings());

	return (
		<>
			<TopRow style={{maxWidth}}>
				<div>IMAT Session</div>
				<div>
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
				/>
			</TableRow>
		</>
	)
}

export default ImatMeetings;
