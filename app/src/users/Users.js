import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {ControlHeader, ControlCell} from 'dot11-common/table'
import {ActionButton} from 'dot11-common/general/Icons'
import {ConfirmModal} from 'dot11-common/modals'
import UsersImport from './UsersImport'
import UserAddEditModal, {EditUserAction} from './UserAddEdit'

import {getSortedFilteredIds, getData} from 'dot11-common/store/dataSelectors'
import {loadUsers, deleteUsers, AccessLevel, AccessLevelOptions} from '../store/users'

const dataSet = 'users'

const DefaultUser = {SAPIN: '', Name: '', Email: '', Access: AccessLevel.Member}

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
		width: 100, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'Name', 
		label: 'Name',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Email', 
		label: 'eMail Address',
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

function Users({
	selected,
	valid,
	loading,
	showIds,
	loadUsers,
	deleteUsers
}) {
	const [editUser, setEditUser] = React.useState({action: EditUserAction.CLOSED, user: DefaultUser});

	const columns = React.useMemo(() => {
		
		const onDelete = async (user) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${user.Name} (${user.SAPIN})?`)
			if (ok)
				deleteUsers([user[primaryDataKey]])
		}

		return tableColumns.map(col => {
			if (col.key === 'Actions')
				return {
					...col,
					cellRenderer: ({rowData}) => 
						<RowActions
							onEdit={() => setEditUser({action: EditUserAction.UPDATE, user: rowData})}
							onDelete={() => onDelete(rowData)}
						/>
				}
			else
				return col
		});

	}, [deleteUsers]);

	React.useEffect(() => {
		if (!valid && !loading)
			loadUsers()
	}, []);

	const handleRemoveSelected = async () => {
		const ids = [];
		for (let id of shownIds) { // only select checked items that are visible
			if (selected.includes(id))
				ids.push(id)
		}
		if (ids.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + ids.join(', ') + '?')
			if (ok)
				await deleteUsers(ids)
		}
	}

	const openAddUser = () => setEditUser({action: EditUserAction.ADD, user: DefaultUser})
	const closeEditUser = () => setEditUser(s => ({...s, action: EditUserAction.CLOSED}))

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<div>Users</div>
				<div>
					<ActionButton name='add' title='Add User' onClick={openAddUser} />
					<ActionButton name='delete' title='Remove Selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<UsersImport />
					<ActionButton name='refresh' title='Refresh' onClick={loadUsers} />
				</div>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					fixed
					columns={columns}
					headerHeight={36}
					estimatedRowHeight={36}
					dataSet='users'
					rowKey={primaryDataKey}
				/>
			</TableRow>

			<UserAddEditModal
				isOpen={editUser.action !== EditUserAction.CLOSED}
				close={closeEditUser}
				action={editUser.action}
				user={editUser.user}
			/>
		</React.Fragment>
	)
}

Users.propTypes = {
	selected: PropTypes.array.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	shownIds: PropTypes.array.isRequired,
	loadUsers: PropTypes.func.isRequired,
	deleteUsers: PropTypes.func.isRequired
}

export default connect(
	(state) => ({
			selected: state[dataSet].selected,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			shownIds: getSortedFilteredIds(state, dataSet),
		}),
	{loadUsers, deleteUsers}
)(Users)
