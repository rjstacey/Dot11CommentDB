import PropTypes from 'prop-types'
import React, {useState, useEffect, useRef} from 'react'
import { connect } from 'react-redux'
import AppTable from '../general/AppTable'
import AppModal from '../modals/AppModal'
import ConfirmModal from '../modals/ConfirmModal'
import {ActionButton} from '../general/Icons'
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


function AddUserModal(props) {
	const defaultUserData = {SAPIN: '', Name: '', Email: '', Access: 3}
	const [userData, setUserData] = useState(defaultUserData)

	function onOpen() {
		setUserData(defaultUserData)
	}

	function change(e) {
		setUserData({...userData, [e.target.name]: e.target.value})
	}

	function submit(e) {
		console.log(userData)
		props.dispatch(addUser(userData))
		props.close()
	}

	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<label>SA PIN:<input type='text' name='SAPIN' value={userData.SAPIN} onChange={change}/></label><br />
			<label>Name:<input type='text' name='Name' value={userData.Name} onChange={change}/></label><br />
			<label>Email:<input type='text' name='Email' value={userData.Email} onChange={change}/></label><br />
			<label>Access Level:
				<select name='Access' value={userData.Access} onChange={change}>
				<option value='1'>Basic</option>
				<option value='2'>Plus</option>
				<option value='3'>Super</option>
				</select>
			</label><br />
			<button onClick={submit}>Add</button>
			<button onClick={props.close}>Cancel</button>
		</AppModal>
	)
}
AddUserModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	dispatch: PropTypes.func.isRequired
}

function UploadUsersModal(props) {
	const usersFileInputRef = useRef()

	function submit() {
		props.dispatch(uploadUsers(usersFileInputRef.current.files[0])).then(props.close)
	}

	return (
		<AppModal
			isOpen={props.isOpen}
			onRequestClose={props.close}
		>
			<p>Upload users</p>
			<input
				type='file'
				accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				ref={usersFileInputRef}
			/>
			<br />
			<button onClick={submit}>OK</button>
			<button onClick={props.close}>Cancel</button>
		</AppModal>
	)
}
UploadUsersModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	dispatch: PropTypes.func.isRequired
}

function Users(props) {

	const columns = [
		{dataKey: 'SAPIN',  label: 'SA PIN',
			sortable: true,
			width: 100,
			cellRenderer: renderEditable},
		{dataKey: 'Name',   label: 'Name',
			sortable: true,
			width: 300,
			cellRenderer: renderEditable},
		{dataKey: 'Email',  label: 'eMail Address',
			sortable: true,
			width: 300,
			cellRenderer: renderEditable},
		{dataKey: 'Access', label: 'Access Level',
			sortable: true,
			width: 100,
			cellRenderer: renderAccess,
			isLast: true}
	]
	const primaryDataKey = columns[0].dataKey

	const [showAddUserModal, setShowAddUserModal] = useState(false)
	const [showUploadUsersModal, setShowUploadUsersModal] = useState(false)

	function getTableSize() {
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)

		const headerEl = document.getElementsByTagName('header')[0]

		const height = window.innerHeight -  headerEl.offsetHeight - 1
		const width = window.innerWidth - 1

		return {height, width: Math.min(width, maxWidth)}
	}

	const {width} = getTableSize()

	useEffect(() => {
		if (!props.usersValid) {
			props.dispatch(getUsers())
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
				await props.dispatch(deleteUsers(ids))
			}
		}
	}

	function refresh() {
		props.dispatch(getUsers())
	}

	function updateUserField(rowIndex, dataKey, fieldData) {
		const index = props.usersMap[rowIndex]
		const u = props.users[index]
		if (dataKey === 'SAPIN') {
			fieldData = parseInt(fieldData, 10)
		}
		props.dispatch(updateUser(u.SAPIN, {[dataKey]: fieldData}))
	}

	function updateUserFieldIfChanged(rowIndex, dataKey, fieldData) {
		const index = props.usersMap[rowIndex]
		const u = props.users[index]
		if (dataKey === 'SAPIN') {
			fieldData = parseInt(fieldData, 10)
		}
		if (u[dataKey] !== fieldData) {
			props.dispatch(updateUser(u.SAPIN, {[dataKey]: fieldData}))
		}
	}

	function renderEditable({rowIndex, rowData, dataKey}) {
		return (
			<div
				title={rowData[dataKey]}
				contentEditable
				onBlur={e => {
					updateUserFieldIfChanged(rowIndex, dataKey, e.target.innerHTML)
				}}
				dangerouslySetInnerHTML={{__html: rowData[dataKey]}}
			/>
		)
	}

	function renderAccess({rowIndex, rowData, dataKey}) {
		return (
			<select 
				value={rowData[dataKey]}
				onChange={e => {
					updateUserField(rowIndex, dataKey, e.target.value)
				}}
			>
				<option value='0'>Public</option>
				<option value='1'>Member</option>
				<option value='2'>Subgroup Admin</option>
				<option value='3'>WG Admin</option>
			</select>
		)
	}

	return (
		<div id='Users' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: width, justifyContent: 'space-between'}}>
				<span><label>Users</label></span>
				<span>
					<ActionButton name='add' title='Add User' onClick={() => setShowAddUserModal(true)} />
					<ActionButton name='delete' title='Remove Selected' disabled={props.selected.length === 0} onClick={handleRemoveSelected} />
					<ActionButton name='upload' title='Upload Users' onClick={() => setShowUploadUsersModal(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</span>
			</div>
			<AppTable
				columns={columns}
				rowHeight={22}
				getTableSize={getTableSize}
				loading={props.getUsers}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				setSort={(dataKey, event) => props.dispatch(setUsersSort(event, dataKey))}
				filters={props.filters}
				setFilter={(dataKey, value) => props.dispatch(setUsersFilter(dataKey, value))}
				selected={props.selected}
				setSelected={(ids) => props.dispatch(setUsersSelected(ids))}
				data={props.users}
				dataMap={props.usersMap}
				primaryDataKey={primaryDataKey}
			/>

			<AddUserModal
				isOpen={showAddUserModal}
				close={() => setShowAddUserModal(false)}
				dispatch={props.dispatch}
			/>

			<UploadUsersModal
				isOpen={showUploadUsersModal}
				close={() => setShowUploadUsersModal(false)}
				dispatch={props.dispatch}
			/>
		</div>
	)
}

function mapStateToProps(state) {
	const s = state.users
	return {
		filters: s.filters,
		sortBy: s.sortBy,
		sortDirection: s.sortDirection,
		selected: s.selected,
		usersValid: s.usersValid,
		users: s.users,
		usersMap: s.usersMap,
		getUsers: s.getUsers,
		updateUser: s.updateUser,
		addUser: s.addUser,
		deleteUsers: s.deleteUsers,
	}
}

export default connect(mapStateToProps)(Users)
