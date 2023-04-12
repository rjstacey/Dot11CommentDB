import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import {
	AppTable, 
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	ConfirmModal,
	ActionButton,
	displayDateRange
} from 'dot11-components';

import {
	loadAttendees,
	importSelectedAttendees,
	selectAttendeesState,
	fields,
	attendeesSelectors,
	attendeesActions
} from '../store/attendees';

import type { Session } from '../store/sessions';
import type { Breakout } from '../store/breakouts';

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
	flex-direction: column;
	align-items: center;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const renderHeaderNameAndEmail = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='Name' label='Name' />
		<TableColumnHeader {...props} dataKey='Email' label='Email' />
	</>

type ColumnPropertiesWidth = ColumnProperties & { width: number };	// width required

const tableColumns: ColumnPropertiesWidth[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: p =>
			<SelectCell
				selectors={attendeesSelectors}
				actions={attendeesActions}
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
];

const attendanceColumn =
	{key: 'AttendancePercentage', 
		...fields.AttendancePercentage,
		width: 150, flexGrow: 1, flexShrink: 1};

const renderTitle = (meeting: Session, breakout: Breakout) =>
	<>
		<div>
			<span>{meeting.name}</span><br />
			<span>{displayDateRange(meeting.startDate, meeting.endDate)}</span><br />
			<span>{'Time zone: ' + meeting.timezone}</span>
		</div>
		<div>
			<span>{breakout && breakout.Name}</span>
		</div>
	</>

function Attendees() {
	const navigate = useNavigate();
	const session_id = parseInt(useParams().session_id!);
	const breakout_id = parseInt(useParams().breakoutId!);
	const dispatch = useAppDispatch();
	const {valid, session, breakout} = useAppSelector(selectAttendeesState);

	React.useEffect(() => {
		if (!valid || session?.id !== session_id || breakout?.id !== breakout_id)
			dispatch(loadAttendees(session_id, breakout_id));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const {columns, maxWidth} = React.useMemo(() => {
		let columns = tableColumns;
		if (!breakout_id) {
			columns = columns.concat(attendanceColumn);
		}
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);
		return {columns, maxWidth};
	}, [breakout_id]);

	const handleImportAttandees = async () => {
		const ok = await ConfirmModal.show('Import selected to members list?');
		if (ok)
			dispatch(importSelectedAttendees());
	}
	const refresh = () => loadAttendees(session_id, breakout_id);
	const close = () => navigate(-1);

	return (
		<>
			<TopRow style={{maxWidth}}>
				{valid? renderTitle(session!, breakout!): null}
				<div>
					<ActionButton name='import' title='Add Selected' onClick={handleImportAttandees} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					<ActionButton name='close' title='Close' onClick={close} />
				</div>
			</TopRow>

			<TableRow>
				<AppTable
					fitWidth
					fixed
					columns={columns}
					headerHeight={40}
					estimatedRowHeight={50}
					selectors={attendeesSelectors}
					actions={attendeesActions}
				/>
			</TableRow>
		</>
	)
}

export default Attendees;
