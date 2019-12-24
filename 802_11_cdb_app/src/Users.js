import PropTypes from 'prop-types';
import React, {useState, useEffect} from 'react';
import { connect } from 'react-redux';
import AppTable from './AppTable';
import AppModal from './AppModal';
import {sortClick, filterValidate} from './filter';
import {IconRefresh, IconAdd, IconDelete} from './Icons';
import {setUsersFilters, setUsersSort, getUsers, updateUser, addUser, deleteUsers} from './actions/users';
import styles from './AppTable.css';


function AddUserModal(props) {
	const defaultUserData = {SAPIN: '', Name: '', Email: '', Access: 3};
	const [userData, setUserData] = useState(defaultUserData);

	function onOpen() {
		setUserData(defaultUserData)
	}

	function change(e) {
		setUserData({...userData, [e.target.name]: e.target.value});
	}

	function submit(e) {
		console.log(userData);
		props.dispatch(addUser(userData));
		props.close();
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

function Users(props) {

	const columns = [
		{dataKey: 'SAPIN',  label: 'SA PIN',
			sortable: true,
			filterable: true,
			width: 100,
			cellRenderer: renderEditable},
		{dataKey: 'Name',   label: 'Name',
			sortable: true,
			filterable: true,
			width: 300,
			cellRenderer: renderEditable},
		{dataKey: 'Email',  label: 'eMail Address',
			sortable: true,
			filterable: true,
			width: 300,
			cellRenderer: renderEditable},
		{dataKey: 'Access', label: 'Access Level',
			sortable: true,
			filterable: true,
			width: 100,
			cellRenderer: renderAccess},
		{dataKey: '', label: '',
			sortable: false,
			filterable: false,
			width: 200,
			headerRenderer: renderHeaderActions,
			cellRenderer: renderActions,
			isLast: true}
	];
	const primaryDataKey = columns[0].dataKey

	const [tableHeight, setTableHeight] = useState(400)
	const [tableWidth, setTableWidth] = useState(300)
	const [showAddUserModal, setShowAddUserModal] = useState(false);
	const [selected, setSelected] = useState([])
	
	useEffect(() => {

		function updateDimensions() {
			const header = document.getElementsByTagName('header')[0]
			if (header) {
				setTableHeight(window.innerHeight - header.offsetHeight - 5)
				setTableWidth(window.innerWidth - 1)
			}
		}

		updateDimensions();

		window.addEventListener("resize", updateDimensions);
		return () => {
			window.removeEventListener("resize", updateDimensions);
		}
	}, [])

	useEffect(() => {
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			for (let col of columns) {
				if (col.filterable) {
					filters[col.dataKey] = filterValidate(col.dataKey, '')
				}
			}
			props.dispatch(setUsersFilters(filters));
		}
		if (!props.usersDataValid) {
			props.dispatch(getUsers())
		}
	}, [])

	function handleRemoveSelected() {
		const {usersData, usersDataMap} = props;
		var ids = [];
		for (var i = 0; i < usersDataMap.length; i++) { // only select checked items that are visible
			let id = usersData[usersDataMap[i]][primaryDataKey]
			if (selected.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length) {
			props.dispatch(deleteUsers(ids))
		}
	}

	function deleteRow(rowIndex) {
		const u = props.usersData[props.usersDataMap[rowIndex]];
		console.log(rowIndex, u)
		props.dispatch(deleteUsers([u[primaryDataKey]]))
	}

	function refresh() {
		props.dispatch(getUsers());
	}

	function updateUserField(rowIndex, dataKey, fieldData) {
		const usersDataIndex = props.usersDataMap[rowIndex];
		const u = props.usersData[usersDataIndex];
		props.dispatch(updateUser({
			UserID: u.UserID,
			[dataKey]: fieldData
		}));
	}

	function updateUserFieldIfChanged(rowIndex, dataKey, fieldData) {
		const usersDataIndex = props.usersDataMap[rowIndex];
		const u = props.usersData[usersDataIndex];
		if (u[dataKey] !== fieldData) {
			props.dispatch(updateUser({
				UserID: u.UserID,
				[dataKey]: fieldData
			}));
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
				<option value='1'>Basic</option>
				<option value='2'>Plus</option>
				<option value='3'>Super</option>
			</select>
		)
	}

	function renderActions({rowIndex}) {
		return (
			<div className={styles.actionColumn}>
				<IconDelete title='Delete' onClick={e => deleteRow({rowIndex})} />
			</div>
		)
	}

	function renderHeaderActions({rowIndex}) {
		return (
			<React.Fragment>
				<IconRefresh title='Refresh' onClick={refresh} />&nbsp;
				<IconAdd title='Add User' onClick={() => setShowAddUserModal(true)} />&nbsp;
				<IconDelete title='Remove Selected Users' onClick={handleRemoveSelected} />
			</React.Fragment>
		)
	}

  	function sortChange(event, dataKey) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setUsersSort(sortBy, sortDirection));
	}

	function filterChange(event, dataKey) {
		var filter = filterValidate(dataKey, event.target.value)
		props.dispatch(setUsersFilters({[dataKey]: filter}));
	}

	return (
		<div id='Users'>
			<AppTable
				hasRowSelector={true}
				hasRowExpander={false}
				columns={columns}
				rowHeight={22}
				height={tableHeight}
				width={tableWidth}
				loading={props.getUsers}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				sortChange={sortChange}
				filterChange={filterChange}
				//showSelected={() => setShowSelected(true)}
				setSelected={(ids) => setSelected(ids)}
				selected={selected}
				data={props.usersData}
				dataMap={props.usersDataMap}
				primaryDataKey={primaryDataKey}
			/>

			<AddUserModal
				isOpen={showAddUserModal}
				close={() => setShowAddUserModal(false)}
				dispatch={props.dispatch}
			/>
		</div>
	)
}

function mapStateToProps(state) {
	const s = state.users;
	return {
		filters: s.filters,
		sortBy: s.sortBy,
		sortDirection: s.sortDirection,
		usersDataValid: s.usersDataValid,
		usersData: s.usersData,
		usersDataMap: s.usersDataMap,
		getUsers: s.getUsers,
		updateUser: s.updateUser,
		addUser: s.addUser,
		deleteUsers: s.deleteUsers,
	}
}
export default connect(mapStateToProps)(Users);
