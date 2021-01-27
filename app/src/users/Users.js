import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import Immutable from 'immutable'
import styled from '@emotion/styled'
import AppTable from '../table/AppTable'
import ConfirmModal from '../modals/ConfirmModal'
import {ActionButton} from '../general/Icons'
import UsersImport from './UsersImport'
import UserAddEditModal, {EditUserAction} from './UserAddEdit'

import {getDataMap} from '../store/selectors/dataMap'
import {getUsers, deleteUsers, AccessLevel, AccessLevelOptions} from '../store/actions/users'

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

const tableColumns = Immutable.OrderedMap({
	SAPIN: 		{label: 'SA PIN', 		width: 100, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	Name: 		{label: 'Name', 		width: 300, flexGrow: 1, flexShrink: 1},
	Email: 		{label: 'eMail Address',width: 300, flexGrow: 1, flexShrink: 1},
	Access: 	{label: 'Access Level',	width: 150, flexGrow: 1, flexShrink: 1, dropdownWidth: 200,
					cellRenderer: renderAccess},
	Actions: 	{label: 'Actions',		width: 100, flexGrow: 1, flexShrink: 1}
});
const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40;
const primaryDataKey = 'SAPIN';

function Users({
	selected,
	valid,
	loading,
	users,
	usersMap,
	getUsers,
	deleteUsers
}) {
	const [editUser, setEditUser] = React.useState({action: EditUserAction.CLOSED, user: DefaultUser});

	const columns = React.useMemo(() => {
		
		const onDelete = async (user) => {
			const ok = await ConfirmModal.show(`Are you sure you want to delete ${user.Name} (${user.SAPIN})?`)
			if (ok)
				deleteUsers([user[primaryDataKey]])
		}

		let columns = tableColumns;
		columns = columns
			.update('Actions', v => ({
				...v,
				cellRenderer: ({rowData}) => 
					<RowActions
						onEdit={() => setEditUser({action: EditUserAction.UPDATE, user: rowData})}
						onDelete={() => onDelete(rowData)}
					/>
			}));
		return columns
	}, [deleteUsers]);

	React.useEffect(() => {
		if (!valid)
			getUsers()
	}, [valid, getUsers]);

	const handleRemoveSelected = async () => {
		const ids = [];
		for (var i = 0; i < usersMap.length; i++) { // only select checked items that are visible
			let id = users[usersMap[i]][primaryDataKey]
			if (selected.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + ids.join(', ') + '?')
			if (ok)
				await deleteUsers(ids)
		}
	}

	const openAddUser = () => setEditUser({action: EditUserAction.ADD, user: DefaultUser})
	const openEditUser = ({rowData}) => setEditUser({action: EditUserAction.UPDATE, user: rowData})
	const closeEditUser = () => setEditUser(s => ({...s, action: EditUserAction.CLOSED}))

	return (
		<React.Fragment>
			<TopRow style={{maxWidth}}>
				<div>Users</div>
				<div>
					<ActionButton name='add' title='Add User' onClick={openAddUser} />
					<ActionButton name='delete' title='Remove Selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
					<UsersImport />
					<ActionButton name='refresh' title='Refresh' onClick={getUsers} />
				</div>
			</TopRow>

			<TableRow style={{maxWidth}}>
				<AppTable
					fixed
					columns={columns}
					controlColumn
					headerHeight={36}
					estimatedRowHeight={36}
					onRowDoubleClick={openEditUser}
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
	users:  PropTypes.array.isRequired,
	usersMap: PropTypes.array.isRequired,
	getUsers: PropTypes.func.isRequired,
	deleteUsers: PropTypes.func.isRequired
}

const dataSet = 'users'
export default connect(
	(state, ownProps) => {
		return {
			selected: state[dataSet].selected,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			users: state[dataSet][dataSet],
			usersMap: getDataMap(state, dataSet),
		}
	},
	(dispatch, ownProps) => ({
		getUsers: () => dispatch(getUsers()),
		deleteUsers: (ids) => dispatch(deleteUsers(ids)),
	})
)(Users)
