import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import {Column, Table} from 'react-virtualized';
import Draggable from 'react-draggable';
import {sortClick, allSelected, toggleVisible, filterValidate} from './filter';
import {setUsersFilters, setUsersSort, getUsers, updateUser, addUser, deleteUsers} from './actions/users';
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
				cellRenderer: this.renderAccess},
			{dataKey: '', label: '',
				width: 200,
				headerRenderer: this.renderHeaderActions,
				cellRenderer: this.renderActions,
				isLast: true}
		];

		// List of filterable columns
    	const filterable = ['SAPIN', 'Name', 'Email'];
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			filterable.forEach(dataKey => {filters[dataKey] = ''});
			this.props.dispatch(setUsersFilters(filters));
		}

		this.sortable = ['SAPIN', 'Name', 'Email', 'Access'];

		var columnVisible = {};
		var columnWidth = {};
		var width = 0;
		this.columns.forEach(col => {
			width += col.width;
			if (col.dataKey) {
				columnVisible[col.dataKey] = !col.hiddenByDefault;
				columnWidth[col.dataKey] = col.width
			}
		});

		this.state = {
			height: 800,
			width: width,
			showAddModal: false,
			selectedUsers: [],

			columnVisible,
			columnWidth
		}
	}

	componentDidMount() {
		if (!this.props.usersDataValid) {
			this.props.dispatch(getUsers())
		}
	}

	resizeColumn = ({dataKey, deltaX}) => {
		var i = this.columns.findIndex(c => c.dataKey === dataKey)
		this.columns[i].width += deltaX;
		this.setState({columnWidth: update(this.state.columnWidth, {$set: {[this.columns[i].dataKey]: this.columns[i].width}})})
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

	deleteRow = (rowIndex) => {
		const u = this.props.usersData[this.props.usersDataMap[rowIndex]];
		console.log(rowIndex, u)
		this.props.dispatch(deleteUsers([u.UserID]))
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

	renderLabel = ({dataKey, label}) => {
		if (this.sortable.includes(dataKey)) {
			const sortDirection = this.props.sortBy.includes(dataKey)? this.props.sortDirection[dataKey]: 'NONE';
			return (
				<div
					className={styles.headerLabel}
					title={label}
					style={{cursor: 'pointer'}}
					onClick={e => this.sortChange(e, dataKey)}
				>
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'NONE'? '100%': 'calc(100% - 12px)'}}>{label}</div>
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'ASC'? '12px': '0'}}><i className="fa fa-sort-alpha-down" /></div>
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'DESC'? '12px': '0'}}><i className="fa fa-sort-alpha-up" /></div>
				</div>
			)
		}
		else {
			return (
				<div
					className={styles.headerLabel}
					title={label}
				>
					{label}
				</div>
			)
		}
	}

	renderFilter = ({dataKey}) => {
		var filter = this.props.filters[dataKey]
		var classNames = styles.headerFilt
		if (filter && !filter.valid) {
			classNames += ' ' + styles.headerFiltInvalid
		}
		return (
			<input
				type='text'
				className={classNames}
				placeholder='Filter'
				onChange={e => {this.filterChange(e, dataKey)}}
				value={filter.filtStr}
			/>
		)
	}

	renderHeaderCell = ({columnData, dataKey, label}) => {
		const col = columnData;
		const showFilter = this.props.filters.hasOwnProperty(dataKey);

		if (col.isLast) {
			return (
				<div className={styles.headerLabelBox} style={{flex: '0 0 100%'}}>
					{this.renderLabel({dataKey, label})}
					{showFilter && this.renderFilter({dataKey})}
				</div>
			)
		}
		return (
			<React.Fragment>
				<div className={styles.headerLabelBox} style={{flex: '0 0 calc(100% - 12px)'}}>
					{this.renderLabel({dataKey, label})}
					{showFilter && this.renderFilter({dataKey})}
				</div>
				<Draggable
					axis="x"
					defaultClassName={styles.headerDrag}
					defaultClassNameDragging={styles.dragHandleActive}
					onDrag={(event, {deltaX}) => this.resizeColumn({dataKey, deltaX})}
					position={{x: 0}}
					zIndex={999}
				>
					<span className={styles.dragHandleIcon}>⋮</span>
				</Draggable>
			</React.Fragment>
		)
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
				title={rowData[dataKey]}
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

	renderActions = ({rowIndex}) => {
		return (
			<div className={styles.actionColumn}>
				<span className="fa fa-trash-alt" title='Delete' />
			</div>
		)
	}

	renderHeaderActions = ({rowIndex}) => {
		return (
			<React.Fragment>
				<span className="fa fa-sync-alt" title='Refresh' onClick={this.refresh} />&nbsp;
				<span className="fa fa-plus" title='Add User' onClick={() => this.setState({showAddUserModal: true})} />&nbsp;
				<span className="fa fa-trash-alt" title='Remove Selected Users' onClick={this.handleRemoveSelected} />
			</React.Fragment>
		)
	}

  	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setUsersSort(sortBy, sortDirection));
	}

	filterChange = (event, dataKey) => {
		var filter = filterValidate(dataKey, event.target.value)
		this.props.dispatch(setUsersFilters({[dataKey]: filter}));
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
					const {cellRenderer, headerRenderer, width, ...otherProps} = col;
					return (
						<Column 
							key={index}
							className={styles.rowColumn}
							columnData={col}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							cellRenderer={cellRenderer}
							width={this.state.columnWidth[col.dataKey]? this.state.columnWidth[col.dataKey]: width}
							{...otherProps}
						/>
				)})}
			</Table>
		)
	}

	render() {
		return (
			<div id='Users'>

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
