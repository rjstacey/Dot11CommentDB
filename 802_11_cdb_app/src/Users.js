import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import {Column, Table} from 'react-virtualized';
import {sortClick, allSelected, toggleVisible, SortIndicator} from './filter';
import {setUsersFilter, setUsersSort, getUsers, updateUser, addUser, deleteUsers} from './actions/users';
import styles from './AppTable.css';

const defaultUserData = {SAPIN: '', Name: '', Email: '', Access: 3};

class AddUserModal extends React.PureComponent {
	constructor(props) {
		super(props)

		this.state = {
			wasOpen: props.isOpen,
			userData: defaultUserData
		}
	}

	static getDerivedStateFromProps(props, state) {
		// Reset userData to default on each open
		var newState = {};
		if (props.isOpen && !state.wasOpen) {
			newState.userData = defaultUserData;
		}
		newState.wasOpen = props.isOpen;
		return newState;
	}

	change = (e) => {
		this.setState({userData: Object.assign({}, this.state.userData, {[e.target.name]: e.target.value})});
	}

	submit = (e) => {
		console.log(this.state.userData);
		this.props.dispatch(addUser(this.state.userData));
		this.props.close();
	}

	render() {
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<label>SA PIN:<input type='text' name='SAPIN' value={this.state.userData.SAPIN} onChange={this.change}/></label><br />
				<label>Name:<input type='text' name='Name' value={this.state.userData.Name} onChange={this.change}/></label><br />
				<label>Email:<input type='text' name='Email' value={this.state.userData.Email} onChange={this.change}/></label><br />
				<label>Access Level:
					<select name='Access' value={this.state.userData.Access} onChange={this.change}>
					<option value='1'>Basic</option>
					<option value='2'>Plus</option>
					<option value='3'>Super</option>
					</select>
				</label><br />
				<button onClick={this.submit}>Add</button>
				<button onClick={this.props.close}>Cancel</button>
			</Modal>
		)
	}
}

class Users extends React.PureComponent {

	constructor(props) {
		super(props)

		this.columns = [
			{dataKey: '',       label: '',
				width: 40, flexGrow: 0, flexShrink: 0,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},
			{dataKey: 'SAPIN',  label: 'SA PIN',
				width: 100,
				cellRenderer: this.renderEditable},
			{dataKey: 'Name',   label: 'Name',
				width: 300,
				cellRenderer: this.renderEditable},
			{dataKey: 'Email',  label: 'eMail Address',
				width: 300,
				cellRenderer: this.renderEditable},
			{dataKey: 'Access', label: 'Access Level',
				width: 100,
				cellRenderer: this.renderAccess}
		];

		// List of filterable columns
    	const filterable = ['SAPIN', 'Name', 'Email'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setUsersFilter(dataKey, ''));
			});
		}

		this.sortable = ['SAPIN', 'Name', 'Email', 'Access'];

		this.state = {
			height: 800,
			width: 600,
			showAddModal: false,
			selectedUsers: [],
			userAdd: {SAPIN: '', Name: '', Email: '', Access: 3},
		}
	}

	componentDidMount() {
		var wrapper = document.getElementById('Users');
		this.setState({
			height: wrapper.offsetHeight - 19,
			width: Math.min(wrapper.offsetWidth, 800)
		})
		if (!this.props.usersDataValid) {
			this.props.dispatch(getUsers())
		}
	}

	handleRemoveSelected = () => {
		const {usersData, usersDataMap} = this.props;
		var delUserIds = [];
		for (var i = 0; i < usersDataMap.length; i++) { // only select checked items that are visible
			let userId = usersData[usersDataMap[i]].UserID
			if (this.state.selectedUsers.includes(userId)) {
				delUserIds.push(userId)
			}
		}
		if (delUserIds.length) {
			this.props.dispatch(deleteUsers(delUserIds))
		}
	}

	refresh = () => {
		this.props.dispatch(getUsers());
	}

	updateUserField = (rowIndex, dataKey, fieldData) => {
		const usersDataIndex = this.props.usersDataMap[rowIndex];
		const u = this.props.usersData[usersDataIndex];
		this.props.dispatch(updateUser({
			UserID: u.UserID,
			[dataKey]: fieldData
		}));
	}

	updateUserFieldIfChanged = (rowIndex, dataKey, fieldData) => {
		const usersDataIndex = this.props.usersDataMap[rowIndex];
		const u = this.props.usersData[usersDataIndex];
		if (u[dataKey] !== fieldData) {
			this.props.dispatch(updateUser({
				UserID: u.UserID,
				[dataKey]: fieldData
			}));
		}
	}

	renderSortLabel = (props) => {
		const {dataKey, label, style} = props;
		const sortDirection = this.props.sortBy.includes(dataKey)? this.props.sortDirection[dataKey]: 'NONE'
		return (
			<span
				key={'label-' + dataKey}
				title={label}
				onClick={e => this.sortChange(e, dataKey)}
				style={{cursor: 'pointer', userSelect: 'none', ...style}}
			>
				{label}
				<SortIndicator sortDirection={sortDirection} />
			</span>
		);
	}
	renderLabel = (props) => {
		const {label, style} = props;
		return (
			<span
				key={'label-' + label}
				title={label}
				style={style}
			>
				{label}
			</span>
		);
	}
	renderFilter = (dataKey) => {
		return (
			<input
				key={'filt-' + dataKey}
				type='text'
				className={styles.headerFilt}
				placeholder='Filter'
				onChange={e => this.filterChange(e, dataKey)}
				value={this.props.filters[dataKey]}
				style={{width: '100%'}}
			/>
		);
	}
	renderHeaderCell = ({columnData, dataKey, label}) => {
		const labelElement = this.sortable.includes(dataKey)? this.renderSortLabel({dataKey, label}): this.renderLabel({label});
		const showFilter = this.props.filters.hasOwnProperty(dataKey)
		return (
			<div>
				{labelElement}
				{showFilter && this.renderFilter(dataKey)}
			</div>
		);
	}

	noRowsRenderer = () => {
		return <div className={styles.noRows}>{this.props.getUsers? 'Loading...': 'No rows'}</div>
	}

	rowClassName = ({index}) => {
		if (index < 0) {
			return styles.headerRow
		} else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow
		}
	}

	renderHeaderCheckbox = ({dataKey}) => {
		const {selectedUsers} = this.state
		const {usersData, usersDataMap} = this.props
		const checked = allSelected(selectedUsers, usersDataMap, usersData, 'UserID')
		return (
			<input
				type="checkbox"
				checked={checked}
				onChange={e => {
					this.setState({selectedUsers: toggleVisible(selectedUsers, usersDataMap, usersData, 'UserID')})
				}}
			/>
		)
	}

	renderEditable = ({rowIndex, rowData, dataKey}) => {
		return (
			<div
				contentEditable
				onBlur={e => {
					this.updateUserFieldIfChanged(rowIndex, dataKey, e.target.innerHTML)
				}}
				dangerouslySetInnerHTML={{__html: rowData[dataKey]}}
			/>
		)
	}

	renderCheckbox = ({rowIndex, rowData, dataKey}) => {
		const userId = rowData.UserID;
		return (
			<input
				type="checkbox"
				checked={this.state.selectedUsers.indexOf(userId) > -1}
				onChange={e => {
					// if userId is present in selectedUsers (i > 0) then remove it; otherwise add it
					let i = this.state.selectedUsers.indexOf(userId);
					this.setState({
						selectedUsers: update(this.state.selectedUsers, (i > -1)? {$splice: [[i, 1]]}: {$push: [userId]})
					})
				}}
			/>
		)
	}

	renderAccess = ({rowIndex, rowData, dataKey}) => {
		return (
			<select 
				value={rowData[dataKey]}
				onChange={e => {
					this.updateUserField(rowIndex, dataKey, e.target.value)
				}}
			>
				<option value='1'>Basic</option>
				<option value='2'>Plus</option>
				<option value='3'>Super</option>
			</select>
		)
	}

  	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setUsersSort(sortBy, sortDirection));
	}
	filterChange = (event, dataKey) => {
		this.props.dispatch(setUsersFilter(dataKey, event.target.value));
	}

	renderTable = () => {
		return (
			<Table
				className={styles.Table}
				height={this.state.height}
				width={this.state.width}
				rowHeight={22}
				headerHeight={40}
				noRowsRenderer={this.noRowsRenderer}
				headerClassName={styles.headerColumn}
				rowClassName={this.rowClassName}
				rowCount={this.props.usersDataMap.length}
				rowGetter={({index}) => {return this.props.usersData[this.props.usersDataMap[index]]}}
			>
				{this.columns.map((col, index) => {
					const {headerRenderer, ...otherProps} = col;
					return (
						<Column 
							key={index}
							columnData={col}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							{...otherProps}
						/>
				)})}
			</Table>
			)
	}

	render() {
		return (
			<div id='Users'>
				<button disabled={this.props.getUsers} onClick={this.refresh}>Refresh</button>
				<button onClick={() => this.setState({showAddUserModal: true})}>Add</button>
				<button onClick={this.handleRemoveSelected}>Remove Selected</button>

				{this.renderTable()}

				<AddUserModal
					isOpen={this.state.showAddUserModal}
					close={() => this.setState({showAddUserModal: false})}
					dispatch={this.props.dispatch}
					appElement={document.querySelector('#Users')}
				/>
			</div>
		)
	}
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
