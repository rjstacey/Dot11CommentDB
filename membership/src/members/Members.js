import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {useHistory} from "react-router-dom"
import AppTable, {ControlHeader, ControlCell, ShowFilters} from 'dot11-common/table'
import {ConfirmModal} from 'dot11-common/modals'
import {ActionButton} from 'dot11-common/lib/icons'
import MembersUpload from './MembersUpload'
import MemberUpdateModal from './MemberUpdate'
import MembersSummary from './MembersSummary'

import {loadMembers, loadMembersWithAttendance, deleteMembers, deleteSelectedMembers, AccessLevel, AccessLevelOptions} from '../store/members'

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

const renderAccess = ({rowData}) => AccessLevelOptions.find(o => o.value === rowData.Access).label;

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
	{key: 'Email', 
		label: 'eMail Address',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status', 
		label: 'Status',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Access', 
		label: 'Access Level',
		width: 150, flexGrow: 1, flexShrink: 1, dropdownWidth: 200,
		cellRenderer: renderAccess},
	{key: 'Actions',
		label: 'Actions',
		width: 100, flexGrow: 1, flexShrink: 1}
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40;
const primaryDataKey = 'SAPIN';

function Members({
	selected,
	valid,
	loading,
	loadMembers,
	deleteMembers,
	deleteSelectedMembers
}) {
	const history = useHistory();
	const [editMember, setEditMember] = React.useState({action: null, member: DefaultMember});

	const columns = React.useMemo(() => {
		
		const onDelete = async (member) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${member.Name} (${member.SAPIN})?`)
			if (ok)
				deleteMembers([member[primaryDataKey]])
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
			else
				return col
		});

	}, []);

	React.useEffect(() => {
		if (!valid)
			loadMembers()
	}, []);

	const handleRemoveSelected = async () => {
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected members?')
		if (ok)
			await deleteSelectedMembers()
	}

	const openAddMember = () => setEditMember({action: 'add', member: DefaultMember})
	const closeMemberUpdate = () => setEditMember(s => ({...s, action: null}))

	const updateStatus = () => history.push('/Members/AttendanceUpdate');

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<MembersSummary />
				<div>
					<ActionButton
						name='edit'
						title='Update member status'
						onClick={updateStatus}
					/>
					<ActionButton name='add' title='Add Member' onClick={openAddMember} />
					<ActionButton name='delete' title='Remove Selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<MembersUpload />
					<ActionButton name='refresh' title='Refresh' onClick={loadMembers} />
				</div>
			</TopRow>
			<ShowFilters
				style={{maxWidth}}
				dataSet={dataSet}
			/>
			<TableRow style={{maxWidth}}>
				<AppTable
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
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

Members.propTypes = {
	selected: PropTypes.array.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	loadMembers: PropTypes.func.isRequired,
	deleteMembers: PropTypes.func.isRequired,
	deleteSelectedMembers: PropTypes.func.isRequired
}

const dataSet = 'members'
export default connect(
	(state) => ({
			selected: state[dataSet].selected,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
		}),
	{loadMembers, loadMembersWithAttendance, deleteMembers, deleteSelectedMembers}
)(Members)
