import React from 'react';
import {Link, useNavigate} from 'react-router-dom';
import styled from '@emotion/styled';

import {
	AppTable, SelectHeaderCell, SelectCell, TableColumnHeader,
	ActionButton,
	HeaderCellRendererProps,
	ColumnProperties
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {selectGroupName} from '../store/groups';

import TopRow from '../components/TopRow';

import {
	loadImatMeetings,
	clearImatMeetings,
	fields,
	imatMeetingsSelectors,
	imatMeetingsActions,
	ImatMeeting
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


const renderDateRangeHeader = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='start' label='Start date' />
		<TableColumnHeader {...props} dataKey='end' label='End date' />
	</>

type ColumnPropertiesWithWidth = ColumnProperties & {width: number};

const tableColumns: ColumnPropertiesWithWidth[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeaderCell {...p} />,
		cellRenderer: p => 
			<SelectCell 
				selectors={imatMeetingsSelectors}
				actions={imatMeetingsActions}
				{...p}
			/>},
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
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const groupName = useAppSelector(selectGroupName);

	React.useEffect(() => {
		dispatch(loadImatMeetings());
	}, [dispatch, groupName]);

	const columns = React.useMemo(() => {
		const renderBreakoutsLink = ({rowData}: {rowData: ImatMeeting}) => <Link to={`/${groupName}/imatMeetings/${rowData.id}`}>view breakouts</Link>
		const columns = [...tableColumns];
		const i = columns.length - 1;
		columns[i] =
			{
				...columns[i],
				cellRenderer: renderBreakoutsLink
			}
		return columns;

	}, [groupName]);

	const close = () => navigate('/sessions');
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
					selectors={imatMeetingsSelectors}
					actions={imatMeetingsActions}
				/>
			</TableRow>
		</>
	)
}

export default ImatMeetings;
