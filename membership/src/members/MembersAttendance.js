import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {ControlHeader, ControlCell} from 'dot11-common/table'
import {ConfirmModal} from 'dot11-common/modals'
import {ActionButton, Button} from 'dot11-common/lib/icons'
import MembersUpload from './MembersUpload'
import MemberUpdateModal from './MemberUpdate'
import {displayDate} from 'dot11-common/lib/utils'
import {Field, Input} from 'dot11-common/general/Form'

import {loadSessions} from '../store/sessions'
import {loadMembersWithAttendance, deleteMembers, deleteSelectedMembers, AccessLevel, AccessLevelOptions} from '../store/members'

const DefaultMember = {SAPIN: '', Name: '', Email: '', Status: 'Non-Voter', Access: AccessLevel.Member}

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
	</ActionCell>

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

const tableColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} />,
		cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />},
	{key: 'SAPIN', 
		label: 'SA PIN',
		width: 80, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'Name', 
		label: 'Name',
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Attendances', 
		label: 'Attendances',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status', 
		label: 'Status',
		width: 160, flexGrow: 1, flexShrink: 1},
	{key: 'NewStatus', 
		label: 'New Status',
		width: 160, flexGrow: 1, flexShrink: 1},
	{key: 'Actions',
		label: 'Actions',
		width: 100, flexGrow: 1, flexShrink: 1}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0);
const primaryDataKey = 'SAPIN';

const SessionsContainer = styled.div`
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	& > div:first-of-type {
		flex-basis: 1.5em;
	}
	& > div:not(:first-of-type) {
		width: 100px;
		margin: 2px;
		padding: 0 4px;
		text-align: right;
	}
`;

function RecentSessions({sessions}) {
	const P = [], I = [];
	for (const s of Object.values(sessions)) {
		const d = <div key={s.id}>{displayDate(s.Start)}</div>;
		if (s && s.Type === 'i')
			I.push(d)
		else
			P.push(d)
	}

	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<SessionsContainer><div>P:</div>{P}</SessionsContainer>
			<SessionsContainer><div>I:</div>{I}</SessionsContainer>
		</div>
	)
}

const AttendanceContainer = styled.div`
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	& > div:first-of-type {
		flex-basis: 1.5em;
	}
	& > div:not(:first-of-type) {
		width: 40px;
		margin: 2px;
		padding: 0 4px;
		text-align: right;
	}
	& .qualifies {
		background-color: #aaddaa;
	}
`;

const _Attendances = ({rowData, dataKey, sessions}) => {
	const attendances = rowData[dataKey];
	if (!attendances)
		return 'None'
	const P = [], I = [];
	let n = 0;
	//console.log(sessions)
	for (const [k, v] of Object.entries(attendances)) {
		const s = sessions[k]
		let qualifies = false;
		/* Plenary session attendance qualifies if the member gets at least 75% attendance credit.
		 * One interim can be substituted for a plenary. */
		if (s && v >= 0.75 && (s.Type === 'p' || (s.Type === 'i' && n++ === 0)))
			qualifies = true;
		const pct = <div key={k} className={qualifies? 'qualifies': undefined}>{(v*100).toFixed(0) + '%'}</div>;
		if (s && s.Type === 'i')
			I.push(pct)
		else
			P.push(pct)
	}
	return (
		<React.Fragment>
			<AttendanceContainer><div>P:</div>{P}</AttendanceContainer>
			<AttendanceContainer><div>I:</div>{I}</AttendanceContainer>
		</React.Fragment>
	)
}

const Attendances = connect((state) => ({sessions: state.members.sessions}))(_Attendances);

function MembersAttendanceUpdate({
	selected,
	valid,
	loading,
	sessions,
	loadMembersWithAttendance,
	deleteMembers,
	deleteSelectedMembers
}) {
	const [editMember, setEditMember] = React.useState({action: null});

	const columns = React.useMemo(() => {
		
		const onDelete = async (member) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${member.Name} (${member.SAPIN})?`)
			if (ok)
				deleteMembers([member.SAPIN])
		}
		
		return tableColumns.map(col => {
			if (col.key === 'Actions')
				return {
					...col,
					cellRenderer: ({rowData}) => 
						<RowActions
							onEdit={() => setEditMember({action: 'update', member: rowData})}
							onDelete={() => onDelete(rowData)}
						/>
				}
			else if (col.key === 'Attendances')
				return {...col, cellRenderer: (props) => <Attendances {...props} />}
			else
				return col;
		});

	}, [sessions]);

	React.useEffect(() => {
		if (!valid)
			loadMembersWithAttendance()
	}, []);

	const handleRemoveSelected = async () => {
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected members?')
		if (ok)
			await deleteSelectedMembers()
	}

	const openAddMember = () => setEditMember({action: 'add', member: DefaultMember})
	const closeMemberUpdate = () => setEditMember(s => ({...s, action: null}))

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<RecentSessions sessions={sessions} />
				<div>
					<Field label='Reason:'><Input type='text' size={24} /></Field>
					<Button>Update selected to New Status</Button>
				</div>
				<div>
					<ActionButton name='delete' title='Remove Selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='refresh' title='Refresh' onClick={loadMembersWithAttendance} />
				</div>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					key={sessions.toString()}
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={50}
					dataSet={dataSet}
					rowKey={primaryDataKey}
				/>
			</TableRow>

			<MemberUpdateModal
				isOpen={!!editMember.action}
				close={closeMemberUpdate}
				action={editMember.action}
				member={editMember.member}
			/>
		</React.Fragment>
	)
}

MembersAttendanceUpdate.propTypes = {
	selected: PropTypes.array.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	sessions: PropTypes.object.isRequired,
	loadMembersWithAttendance: PropTypes.func.isRequired,
	deleteMembers: PropTypes.func.isRequired,
	deleteSelectedMembers: PropTypes.func.isRequired
}

const dataSet = 'members'
export default connect(
	(state) => ({
			selected: state[dataSet].selected,
			loading: state[dataSet].loading,
			valid: state[dataSet].validAttendance,
			sessions: state[dataSet].sessions,
		}),
	{loadSessions, loadMembersWithAttendance, deleteMembers, deleteSelectedMembers}
)(MembersAttendanceUpdate)
