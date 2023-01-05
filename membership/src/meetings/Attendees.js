import React from 'react';
import {useHistory, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable, {SelectHeader, SelectCell, TableColumnHeader} from 'dot11-components/table';
import {ConfirmModal} from 'dot11-components/modals';
import {ActionButton} from 'dot11-components/form';
import {displayDateRange} from 'dot11-components/lib';

import {loadAttendees, importSelectedAttendees, selectAttendeesState, dataSet, fields} from '../store/attendees';
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

const AttendeesColumnDropdown = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;

const renderHeaderNameAndEmail = (props) =>
	<>
		<AttendeesColumnDropdown {...props} dataKey='Name' label='Name' />
		<AttendeesColumnDropdown {...props} dataKey='Email' label='Email' />
	</>

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <SelectHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
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

const renderTitle = (meeting, breakout) =>
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
	const history = useHistory();
	const {session_id, breakout_id} = useParams();
	const dispatch = useDispatch();
	const {valid, session, breakout} = useSelector(selectAttendeesState);

	React.useEffect(() => {
		if (!valid || session.id !== session_id || breakout.id !== breakout_id)
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
	const close = () => history.goBack();

	return (
		<>
			<TopRow style={{maxWidth}}>
				{valid? renderTitle(session, breakout): null}
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
					dataSet={dataSet}
				/>
			</TableRow>
		</>
	)
}

export default Attendees;
