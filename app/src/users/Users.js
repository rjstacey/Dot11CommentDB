import PropTypes from 'prop-types'
import React, {useState, useEffect, useRef} from 'react'
import { connect } from 'react-redux'
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

const defaultUser = {SAPIN: '', Name: '', Email: '', Access: 3}

function AddEditUserModal({isOpen, user, setUser, submit, close}) {

	function change(e) {
		setUser({...user, [e.target.name]: e.target.value})
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<label>SA PIN:<input type='text' name='SAPIN' value={user.SAPIN} onChange={change}/></label><br />
			<label>Name:<input type='text' name='Name' value={user.Name} onChange={change}/></label><br />
			<label>Email:<input type='text' name='Email' value={user.Email} onChange={change}/></label><br />
			<label>Access Level:
				<AccessSelector 
					value={user.Access}
					onChange={value => setUser({...user, Access: value})}
				/>
			</label><br />
			<button onClick={submit}>Add</button>
			<button onClick={close}>Cancel</button>
		</AppModal>
	)
}
AddEditUserModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	submit: PropTypes.func.isRequired,
	close: PropTypes.func.isRequired,
	user: PropTypes.object.isRequired,
	setUser: PropTypes.func.isRequired
}

function UploadUsersModal({isOpen, close, submit}) {
	const fileInputRef = useRef()

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
	(state) => {
		const dataKey = 'Access'
		return {
			filter: state.users.filters[dataKey],
			options: state.users.accessOptions,
		}
	},
	(dispatch) => {
		const dataKey = 'Access'
		return {
			setFilter: (value) => dispatch(setUsersFilter(dataKey, value)),
		}
	}
)(ColumnDropdownFilter)

function usersTableHeader(props) {
	console.log(props)
	return (
		<React.Fragment>
			<ColumnLabel
				dataKey={props.column.key}
				label={props.column.label}
				sort={props.sort}
				setSort={props.setSort}
			/>
			<UsersAccessFilter
				dataKey={props.key}
			/>
		</React.Fragment>
	)
}

const EditUser = {ADD: 1, UPDATE: 2}

function Users(props) {

	const columns = [
		{key: 'SAPIN',  label: 'SA PIN',
			width: 100},
		{key: 'Name',   label: 'Name',
			width: 300},
		{key: 'Email',  label: 'eMail Address',
			width: 300},
		{key: 'Access', label: 'Access Level',
			width: 150,
			cellRenderer: renderAccess,
			headerRenderer: usersTableHeader}
	]
	const primaryDataKey = columns[0].key

	const [showUploadUsersModal, setShowUploadUsersModal] = useState(false)
	const [editUser, setEditUser] = useState(null)
	const [user, setUser] = useState(defaultUser)

	function getTableSize() {
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0) + 40

		const headerEl = document.getElementsByTagName('header')[0]

		const height = window.innerHeight -  headerEl.offsetHeight - 1
		const width = window.innerWidth - 1

		return {height, width: Math.min(width, maxWidth)}
	}

	const {width} = getTableSize()

	useEffect(() => {
		if (!props.usersValid) {
			props.getUsers()
		}
	}, [])

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
		setUser(defaultUser)
		setEditUser(EditUser.ADD)
	}

	function openEditUser({rowData}) {
		setUser(rowData)
		setEditUser(EditUser.UPDATE)
	}

	function submitUser() {
		if (editUser === EditUser.ADD) {
			props.addUser(user).then(setEditUser(null))
		}
		if (editUser === EditUser.UPDATE) {
			props.updateUser(user).then(setEditUser(null))
		}
	}

	function submitUsersUpload(file) {
		props.dispatch(uploadUsers(file)).then(setShowUploadUsersModal(false))
	}

	return (
		<div id='Users' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: width, justifyContent: 'space-between'}}>
				<span><label>Users</label></span>
				<span>
					<ActionButton name='add' title='Add User' onClick={openAddUser} />
					<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='upload' title='Upload Users' onClick={() => setShowUploadUsersModal(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={props.getUsers} />
				</span>
			</div>
			<AppTable
				fixed
				estimatedRowHeight={32}
				headerHeight={64}
				height='70vh'
				width={width}
				columns={columns}
				loading={props.loading}
				onRowDoubleClick={openEditUser}
				sort={props.sort}
				setSort={props.setSort}
				filters={props.filters}
				setFilter={props.setFilter}
				selected={props.selected}
				setSelected={props.setSelected}
				data={props.users}
				dataMap={props.usersMap}
				rowKey={primaryDataKey}
			/>

			<AddEditUserModal
				isOpen={!!editUser}
				close={() => setEditUser(null)}
				submit={submitUser}
				user={user}
				setUser={setUser}
			/>

			<UploadUsersModal
				isOpen={showUploadUsersModal}
				close={() => setShowUploadUsersModal(false)}
				submit={submitUsersUpload}
			/>
		</div>
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
		updateUser: (user) => dispatch(updateUser(user)),
		deleteUsers: (ids) => dispatch(deleteUsers(ids)),
		uploadUsers: (file) => dispatch(uploadUsers(file))
	})
)(Users)
