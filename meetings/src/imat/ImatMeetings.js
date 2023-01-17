import React from 'react';
import {Link, useHistory} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
import AppTable, {SelectHeader, SelectCell, TableColumnHeader} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';

import {selectGroupName} from '../store/groups';

import TopRow from '../components/TopRow';

import {
	loadImatMeetings,
	clearImatMeetings,
	fields,
	dataSet
} from '../store/imatMeetings';

import PathGroupSelector from '../components/PathGroupSelector';

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

const renderDateRangeHeader = (props) =>
	<>
		<ColumnHeader {...props} dataKey='start' label='Start date' />
		<ColumnHeader {...props} dataKey='end' label='End date' />
	</>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'dateRange', 
		...fields.dateRange,
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderDateRangeHeader},
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
		width: 200, flexGrow: 1, flexShrink: 1}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0);

function ImatMeetings() {
	const history = useHistory();
	const dispatch = useDispatch();
	const groupName = useSelector(selectGroupName);

	React.useEffect(() => {
		dispatch(loadImatMeetings());
	}, [dispatch, groupName]);

	const columns = React.useMemo(() => {
		const renderBreakoutsLink = ({rowData}) => <Link to={`/${groupName}/imatMeetings/${rowData.id}`}>view breakouts</Link>
		const columns = [...tableColumns];
		const i = columns.length - 1;
		columns[i] =
			{
				...columns[i],
				cellRenderer: renderBreakoutsLink
			}
		return columns;

	}, [groupName]);

	const close = () => history.push('/sessions');
	const refresh = () => dispatch(loadImatMeetings());
	const clear = () => dispatch(clearImatMeetings());

	return (
		<>
			<TopRow style={{maxWidth}}>
				<PathGroupSelector
					onChange={clear}
				/>
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
					headerHeight={46}
					estimatedRowHeight={36}
					dataSet={dataSet}
				/>
			</TableRow>
		</>
	)
}

export default ImatMeetings;
