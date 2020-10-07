import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from '@emotion/styled'
import AppTable, {ColumnLabel, ColumnDropdownFilter} from '../table/AppTable'
import AppModal from '../modals/AppModal'
import ConfirmModal from '../modals/ConfirmModal'
import {ActionButton} from '../general/Icons'
import AccessSelector from './AccessSelector'
import {
	setUsersFilter,
	setUsersSort,
	setUsersSelected,
	getUsers,
	updateUser,
	addUser,
	deleteUsers,
	uploadUsers
} from '../actions/users'

const DefaultUser = {SAPIN: '', Name: '', Email: '', Access: 3}
const EditUserAction = {CLOSED: 0, ADD: 1, UPDATE: 2}

const Form = styled.ul`
	width: 400px;
	padding: 0;
	overflow: visible;`

const FormRow = styled.li`
	display: flex;
	flex-wrap: wrap;
	margin: 10px;
	justify-content: space-between;
	&:last-child {	/* last item has buttons */
		margin-top: 30px;
		justify-content: space-around;
	}
	& > label {
		flex: 1 0 100px;
		max-width: 220px;
		font-weight: bold;
	}
	& > input {
		flex: 1 0 200px;
	}
	& > button {
		padding: 8px 16px;
		border: none;
		background: #333;
		color: #f2f2f2;
		text-transform: uppercase;
		border-radius: 2px;
	}`

function EditUserModal(props) {
	const [user, setUser] = React.useState(props.user)

	const onOpen = () => setUser(props.user)

	function submit() {
		if (props.action === EditUserAction.ADD)
			props.addUser(user)
		else
			props.updateUser(props.user.SAPIN, user)
		props.close()
	}

	const change = e => setUser({...user, [e.target.name]: e.target.value})
	const actionText = props.action === EditUserAction.ADD? 'Add': 'Update'
	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<p>{actionText} user</p>
			<Form>
				<FormRow>
					<label htmlFor='SAPIN'>SA PIN:</label>
					<input type='text' id='SAPIN' name='SAPIN' value={user.SAPIN} onChange={change}/>
				</FormRow>
				<FormRow>
					<label htmlFor='Name'>Name:</label>
					<input type='text' id='Name' name='Name' value={user.Name} onChange={change}/>
				</FormRow>
				<FormRow>
					<label htmlFor='Email'>Email:</label>
					<input type='text' id='Email' name='Email' value={user.Email} onChange={change}/>
				</FormRow>
				<FormRow>
					<label htmlFor='Access'>Access Level:</label>
					<AccessSelector
						id='Access'
						value={user.Access}
						onChange={value => {console.log(value); setUser({...user, Access: value})}}
					/>
				</FormRow>
				<FormRow>
					<button onClick={submit}>{actionText}</button>
					<button onClick={props.close}>Cancel</button>
				</FormRow>
			</Form>
		</AppModal>
	)
}

EditUserModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	action: PropTypes.number.isRequired,
	user: PropTypes.object.isRequired,
	addUser: PropTypes.func.isRequired,
	updateUser: PropTypes.func.isRequired
}

function UploadUsersModal({isOpen, close, submit}) {
	const fileInputRef = React.useRef()

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<p>Upload users</p>
			<input
				type='file'
				accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				ref={fileInputRef}
			/>
			<br />
			<button onClick={() => submit(fileInputRef.current.files[0])}>OK</button>
			<button onClick={close}>Cancel</button>
		</AppModal>
	)
}

UploadUsersModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	submit: PropTypes.func.isRequired
}

const UsersAccessFilter = connect(
	(state, ownProps) => ({
		filter: state.users.filters[ownProps.dataKey],
		options: state.users.accessOptions,
	}),
	(dispatch, ownProps) => ({
		setFilter: (value) => dispatch(setUsersFilter(ownProps.dataKey, value)),
	})
)(ColumnDropdownFilter)

function usersTableHeader(props) {
	return (
		<React.Fragment>
			<ColumnLabel
				dataKey={props.column.key}
				label={props.column.label}
				sort={props.sort}
				setSort={props.setSort}
			/>
			<UsersAccessFilter
				dataKey={props.column.key}
			/>
		</React.Fragment>
	)
}

function Users(props) {

	const columns = [
		{key: 'SAPIN',  label: 'SA PIN', width: 100},
		{key: 'Name',   label: 'Name', width: 300},
		{key: 'Email',  label: 'eMail Address', width: 300},
		{key: 'Access', label: 'Access Level', width: 150,
			cellRenderer: renderAccess,
			headerRenderer: usersTableHeader}
	]
	const primaryDataKey = columns[0].key

	const [showUploadUsersModal, setShowUploadUsersModal] = React.useState(false)
	const [editUser, setEditUser] = React.useState({
		action: EditUserAction.CLOSED,
		user: DefaultUser})

	React.useEffect(() => {
		if (!props.usersValid)
			props.getUsers()
	}, [])

	const width = Math.min(window.innerWidth, columns.reduce((acc, col) => acc + col.width, 0) + 40)

	async function handleRemoveSelected() {
		const {users, usersMap, selected} = props
		var ids = []
		for (var i = 0; i < usersMap.length; i++) { // only select checked items that are visible
			let id = users[usersMap[i]][primaryDataKey]
			if (selected.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length) {
			const ok = await ConfirmModal.show('Are you sure you want to delete ' + ids.join(', ') + '?')
			if (ok) {
				await props.deleteUsers(ids)
			}
		}
	}

	function renderAccess({rowData}) {
		return props.accessOptions.find(o => o.value === rowData.Access).label
	}

	function openAddUser() {
		setEditUser({
			action: EditUserAction.ADD,
			user: DefaultUser
		})
	}

	function openEditUser({rowData}) {
		setEditUser({
			action: EditUserAction.UPDATE,
			user: rowData
		})
	}

	function submitUsersUpload(file) {
		props.uploadUsers(file).then(setShowUploadUsersModal(false))
	}

	return (
		<React.Fragment>
			<div style={{display: 'flex', justifyContent: 'center'}}>
				<div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width}}>
					<span><label>Users</label></span>
					<span>
						<ActionButton name='add' title='Add User' onClick={openAddUser} />
						<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
						<ActionButton name='upload' title='Upload Users' onClick={() => setShowUploadUsersModal(true)} />
						<ActionButton name='refresh' title='Refresh' onClick={props.getUsers} />
					</span>
				</div>
			</div>

			<div style={{flex: 1}}>
				<AppTable
					fixed
					columns={columns}
					headerHeight={64}
					estimatedRowHeight={32}
					loading={props.loading}
					sort={props.sort}
					setSort={props.setSort}
					filters={props.filters}
					setFilter={props.setFilter}
					selected={props.selected}
					setSelected={props.setSelected}
					onRowDoubleClick={openEditUser}
					data={props.users}
					dataMap={props.usersMap}
					rowKey={primaryDataKey}
				/>
			</div>

			<EditUserModal
				isOpen={editUser.action !== EditUserAction.CLOSED}
				close={() => setEditUser(s => ({...s, action: EditUserAction.CLOSED}))}
				action={editUser.action}
				user={editUser.user}
				addUser={props.addUser}
				updateUser={props.updateUser}
			/>

			<UploadUsersModal
				isOpen={showUploadUsersModal}
				close={() => setShowUploadUsersModal(false)}
				submit={submitUsersUpload}
			/>
		</React.Fragment>
	)
}

export default connect(
	(state, ownProps) => {
		const s = state.users
		return {
			filters: s.filters,
			sort: s.sort,
			selected: s.selected,
			accessOptions: s.accessOptions,
			usersValid: s.usersValid,
			users: s.users,
			usersMap: s.usersMap,
			loading: s.getUsers
		}
	},
	(dispatch, ownProps) => ({
		setFilter: (dataKey, value) => dispatch(setUsersFilter(dataKey, value)),
		setSort: (dataKey, event) => dispatch(setUsersSort(event, dataKey)),
		setSelected: (ids) => dispatch(setUsersSelected(ids)),
		getUsers: () => dispatch(getUsers()),
		addUser: (user) => dispatch(addUser(user)),
		updateUser: (sapin, user) => dispatch(updateUser(sapin, user)),
		deleteUsers: (ids) => dispatch(deleteUsers(ids)),
		uploadUsers: (file) => dispatch(uploadUsers(file))
	})
)(Users)
