import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {
	AppTable, 
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	ActionButton,
	CellRendererProps,
	displayDateRange
} from 'dot11-components';

import {
	loadAttendances,
	importAttendances,
	selectAttendancesState,
	selectSessionEntities,
	selectSessionIds,
	attendancesSelectors,
	attendancesActions
} from '../store/attendances';

import type { MemberAttendances, SessionAttendanceSummary } from '../store/attendances';

import {renderNameAndEmail} from '../members/Members';

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	display: flex;
	width: 100%;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

function SessionSummary() {
	const dispatch = useAppDispatch();
	const sessionEntities = useAppSelector(selectSessionEntities);
	const sessionIds = useAppSelector(selectSessionIds);

	const elements = sessionIds.map(id => {
		const session = sessionEntities[id]!;
		const onClick = () => dispatch(importAttendances(id));
		return (
			<div key={id} style={{display: 'flex', flexDirection: 'column'}}>
				<div>{displayDateRange(session.startDate, session.endDate)}</div>
				<div>{session.type === 'p'? 'Plenary': 'Interim'}</div>
				<div>{session.name}</div>
				<div>
					{`(${session.Attendees} attendees)`}
					<ActionButton
						name='import'
						title='Import attendance summary'
						onClick={onClick}
					/>
				</div>
			</div>
		)
	});

	return <>{elements}</>
}

const renderHeaderNameAndEmail = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='Name' label='Name' />
		<TableColumnHeader {...props} dataKey='Email' label='Email' />
	</>

const renderSessionAttendance = (attendance: SessionAttendanceSummary) =>
	<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
		<span>{attendance.AttendancePercentage.toFixed(1)}</span>
		<span>{attendance.DidAttend? 'Did attend': attendance.DidNotAttend? 'Did not attend': ''}</span>
	</div>

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: p =>
			<SelectCell
				selectors={attendancesSelectors}
				actions={attendancesActions}
				{...p}
			/>},
	{key: 'SAPIN', 
		label: 'SA PIN',
		width: 80, flexGrow: 1, flexShrink: 1},
	{key: 'Name', 
		label: 'Name',
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail},
	{key: 'Affiliation', 
		label: 'Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status', 
		label: 'Status',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'ExpectedStatus', 
		label: 'Expected status',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'Summary', 
		label: 'Summary',
		width: 100, flexGrow: 1, flexShrink: 1},
];

function Attendances() {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const {valid} = useAppSelector(selectAttendancesState);
	const sessionIds = useAppSelector(selectSessionIds);
	const sessionEntities = useAppSelector(selectSessionEntities);

	React.useEffect(() => {
		if (!valid)
			dispatch(loadAttendances());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const columns = React.useMemo(() => {
		return tableColumns.concat(
			sessionIds.map(id => {
				const session = sessionEntities[id]!;
				const cellRenderer = ({rowData}: CellRendererProps<MemberAttendances>) => {
					const attendance = rowData.sessionAttendanceSummaries.find((a: any) => a.session_id === session.id);
					return attendance? renderSessionAttendance(attendance): null;
				}
				const column = {
					key: 'session_' + session.id,
					label: session.name,
					width: 200, flexGrow: 1, flexShrink: 1,
					cellRenderer
				}
				return column;
			}))
	}, [sessionEntities]);

	const refresh = () => dispatch(loadAttendances());
	const close = () => navigate(-1);

	return (
		<>
			<TopRow>
				<SessionSummary />
				<div>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					<ActionButton name='close' title='Close' onClick={close} />
				</div>
			</TopRow>

			<TableRow>
				<AppTable
					columns={columns}
					headerHeight={40}
					estimatedRowHeight={50}
					selectors={attendancesSelectors}
					actions={attendancesActions}
				/>
			</TableRow>
		</>
	)
}

export default Attendances;
