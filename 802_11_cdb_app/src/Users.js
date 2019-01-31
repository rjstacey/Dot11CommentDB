import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import {Column, Table} from 'react-virtualized';
import {filterData, sortData, sortClick, allSelected, toggleVisible, SortIndicator} from './filter';
import {getUsers, clearGetUsersError, updateUser, clearUpdateUserError, addUser, clearAddUserError, deleteUsers, clearDeleteUsersError} from './actions/users';
import styles from './AppTable.css';

class Users extends React.Component {

  constructor(props) {
    super(props)

    this.columns = [
      {dataKey: '',       width: 40,  label: '',
        sortable: false,
        headerRenderer: this.renderHeaderCheckbox,
        cellRenderer: this.renderCheckbox},
      {dataKey: 'SAPIN',  width: 80,  label: 'SA PIN',
        cellRenderer: this.renderEditable},
      {dataKey: 'Name',   width: 300, label: 'Name',
        cellRenderer: this.renderEditable},
      {dataKey: 'Email',  width: 300, label: 'eMail Address',
        cellRenderer: this.renderEditable},
      {dataKey: 'Access', width: 100, label: 'Access Level',
        cellRenderer: this.renderAccess}
    ];

    const filters = {
      Name: '',
      Email: ''
    }

    this.state = {
      showAddModal: false,
      modalMessage: '',
      selectedUsers: [],
      userDataMap: [],
      userAdd: {SAPIN: '', Name: '', Email: '', Access: 3},
      sortBy: [],
      sortDirection: {},
      filters
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.userData.length !== state.userDataMap.length) {
      const newState = {
        userDataMap: sortData(filterData(props.userData, state.filters), props.userData, state.sortBy, state.sortDirection)
      }
      console.log(newState)
      return newState;
    }
    return null;
  }

  showOkModal = (msg) => {
    this.setState({showOkModal: true, modalMessage: msg});
  }
  hideOkModal = () => {
    this.setState({showOkModal: false});
  }
  showAddModal = () => {
    this.setState({showAddModal: true, userAdd: {Name: '', Email: '', Access: 3}});
  }
  hideAddModal = () => {
    this.setState({showAddModal: false});
  }

  handleUserAddChange = (e) => {
    const userAdd = update(this.state.userAdd, {[e.target.name]: {$set: e.target.value}});
    this.setState({userAdd});
  }
  handleUserAddSubmit = (e) => {
    this.setState({showAddModal: false})
    console.log(this.state.userAdd);
    this.props.dispatch(addUser(this.state.userAdd))
    e.preventDefault();
  }

  handleRemoveSelected = () => {
    const {userData} = this.props;
    const {userDataMap} = this.state;
    var delUserIds = [];
    for (var i = 0; i < userDataMap.length; i++) { // only select checked items that are visible
      let userId = userData[userDataMap[i]].UserID
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
    const userDataIndex = this.state.userDataMap[rowIndex];
    const u = this.props.userData[userDataIndex];
    this.props.dispatch(updateUser({
        UserID: u.UserID,
        [dataKey]: fieldData
      }));
  }

  updateUserFieldIfChanged = (rowIndex, dataKey, fieldData) => {
    const userDataIndex = this.state.userDataMap[rowIndex];
    const u = this.props.userData[userDataIndex];
    if (u[dataKey] !== fieldData) {
      this.props.dispatch(updateUser({
        UserID: u.UserID,
        [dataKey]: fieldData
      }));
    }
  }

  renderOkModal = () => {
    const open = this.props.getUsersError
      || this.props.updateUserError
      || this.props.addUserError
      || this.props.deleteUsersError

    var msg = 'Something wrong'
    var dispatchObj = null
    if (this.props.getUsersError) {
      msg = this.props.getUsersMsg
      dispatchObj = clearGetUsersError()
    }
    else if (this.props.updateUserError) {
      msg = this.props.updateUserMsg
      dispatchObj = clearUpdateUserError()
    }
    else if (this.props.addUserError) {
      msg = this.props.addUsersMsg
      dispatchObj = clearAddUserError()
    }
    else if (this.props.deleteUsersError) {
      msg = this.props.deleteUsersMsg
      dispatchObj = clearDeleteUsersError()
    }

    return (
      <Modal
        className='ModalContent'
        overlayClassName='ModalOverlay'
        isOpen={open}
        appElement={document.querySelector('#Users')}
      >
        <p>{msg}</p>
        <button onClick={() => this.props.dispatch(dispatchObj)}>OK</button>
      </Modal>
    )
  }

  renderHeaderCell = ({columnData, dataKey, label}) => {
    const sortDirection = this.state.sortBy.includes(dataKey)? this.state.sortDirection[dataKey]: 'NONE';
    const showIndicator = columnData.hasOwnProperty('sortable')? columnData.sortable: true;
    const showFilter = this.state.filters.hasOwnProperty(dataKey);

    return (
      <div>
        <span
          title={label}
          onClick={e => this.sortChange(e, dataKey)}
          style={{cursor: 'pointer'}}>
          {label}
          {showIndicator && <SortIndicator sortDirection={sortDirection} />}
        </span><br />
        {showFilter &&
          <div
            className={styles.headerFilt}
            placeholder='Filter'
            contentEditable
            onInput={e => {this.filterChange(e, dataKey)}}
          />}
      </div>
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
    const {userDataMap, selectedUsers} = this.state
    const {userData} = this.props
    const checked = allSelected(selectedUsers, userDataMap, userData, 'UserID')
    return (
      <input type="checkbox"
        checked={checked}
        onChange={e => {
          this.setState({selectedUsers: toggleVisible(selectedUsers, userDataMap, userData, 'UserID')})
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
    );
  }

  renderCheckbox = ({rowIndex, rowData, dataKey}) => {
    const userId = rowData.UserID;
    return (
      <input type="checkbox"
        checked={this.state.selectedUsers.indexOf(userId) > -1}
        onChange={e => {
          // if userId is present in selectedUsers (i > 0) then remove it; otherwise add it
          let i = this.state.selectedUsers.indexOf(userId);
          this.setState({
            selectedUsers: update(this.state.selectedUsers, (i > -1)? {$splice: [[i, 1]]}: {$push: [userId]})
          })
        }}
      />
    );
  }

  renderAccess = ({rowIndex, rowData, dataKey}) => {
    return (
      <select 
        value={rowData[dataKey]}
        onChange={e => {
          this.updateUserField(rowIndex, dataKey, e.target.value)
        }}>
        <option value='1'>Basic</option>
        <option value='2'>Plus</option>
        <option value='3'>Super</option>
      </select>
    )
  }

  sortChange = (event, dataKey) => {
    const {sortBy, sortDirection} = sortClick(event, dataKey, this.state.sortBy, this.state.sortDirection);

    this.setState({
      sortBy: sortBy,
      sortDirection: sortDirection,
      userDataMap: sortData(this.state.userDataMap, this.props.userData, sortBy, sortDirection)
    });
  }

  filterChange = (event, dataKey) => {
    const {userData} = this.props
    const {sortBy, sortDirection} = this.state
    const filters = update(this.state.filters, {[dataKey]: {$set: event.target.textContent}})

    this.setState({
      filters: filters,
      userDataMap: sortData(filterData(userData, filters), userData, sortBy, sortDirection)
    });
  }

  renderTable = () => {
    return (
      <Table
        className={styles.Table}
        height={400}
        width={600}
        rowHeight={50}
        headerHeight={60}
        noRowsRenderer={this.noRowsRenderer}
        headerClassName={styles.headerColumn}
        rowClassName={this.rowClassName}
        rowCount={this.state.userDataMap.length}
        rowGetter={({index}) => {return this.props.userData[this.state.userDataMap[index]]}}
      >
        {this.columns.map((col, index) => {
          return (
            <Column 
              key={index}
              className={col.className}
              columnData={col}
              width={col.width}
              label={col.label}
              dataKey={col.dataKey}
              headerRenderer={col.headerRenderer? col.headerRenderer: this.renderHeaderCell}
              cellRenderer={col.cellRenderer}
            />
          )})}
      </Table>
    )
  }
  
  componentDidMount() {
  }

  render() {
  
    return (
      <div id='Users'>
        {!this.props.isFetching && <button onClick={this.refresh}>Refresh</button>}
        <button onClick={this.showAddModal}>Add</button>
        <button onClick={this.handleRemoveSelected}>Remove Selected</button>
        
        {this.renderTable()}

        {this.renderOkModal()}

        <Modal className='ModalContent' overlayClassName='ModalOverlay' isOpen={this.state.showAddModal} appElement={document.querySelector('#Users')}>
          <form className='content' onSubmit={this.handleUserAddSubmit}>
            <label>SA PIN:<input type='text' name='SAPIN' value={this.state.userAdd.SAPIN} onChange={this.handleUserAddChange}/></label><br />
            <label>Name:<input type='text' name='Name' value={this.state.userAdd.Name} onChange={this.handleUserAddChange}/></label><br />
            <label>Email:<input type='text' name='Email' value={this.state.userAdd.Email} onChange={this.handleUserAddChange}/></label><br />
            <label>Access Level:
              <select name='Access' value={this.state.userAdd.Access} onChange={this.handleUserAddChange}>
                <option value='1'>Basic</option>
                <option value='2'>Plus</option>
                <option value='3'>Super</option>
              </select>
            </label><br />
            <button type='submit'>Add</button>
            <button onClick={this.hideAddModal}>close</button>
          </form>
        </Modal>

      </div>
      )
  }
}

function mapStateToProps(state) {
  const s = state.users;
  return {
    userData: s.userData,
    getUsers: s.getUsers,
    getUsersError: s.getUsersError,
    getUsersMsg: s.getUsersMsg,
    updateUser: s.updateUser,
    updateUserError: s.updateUserError,
    updateUserMsg: s.updateUserMsg,
    addUser: s.addUser,
    addUserError: s.addUserError,
    addUserMsg: s.addUserMsg,
    deleteUsers: s.deleteUsers,
    deleteUsersError: s.deleteUsersError,
    deleteUsersMsg: s.deleteUsersMsg
  }
}
export default connect(mapStateToProps)(Users);
