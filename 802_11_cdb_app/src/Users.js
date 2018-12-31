import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import { connect } from 'react-redux';
import {Column, Table} from 'react-virtualized';
import {filterData, sortData, sortClick} from './filter';
import {fetchUsers, deleteUsers, updateUser, addUser, clearError} from './actions/users';
import styles from './AppTable.css';

function SortIndicator(props) {
  const {sortDirection, onClick, ...otherProps} = props;

  return (
    <svg width={18} height={18} viewBox="0 0 24 24" onClick={onClick} {...otherProps}>
      {sortDirection === 'ASC'?
        (<path d="M5 8 l5-5 5 5z" />):
         (sortDirection === 'DESC'?
          (<path d="M5 11 l5 5 5-5 z" />):
            (<path d="M5 8 l5-5 5 5z M5 11 l5 5 5-5 z" />))}
      <path d="M0 0h24v24H0z" fill="none" />
    </svg>
    );
}
class Users extends React.Component {

  constructor(props) {
    super(props)

    this.columns = [
      {Header: '', width: 40, dataKey: 'isChecked', sortable: false, HeaderCell: this.renderHeaderCheckbox, Cell: this.renderCheckbox},
      {Header: 'SA PIN', width: 80, dataKey: 'SAPIN', Cell: this.renderEditable},
      {Header: 'Name', width: 300, dataKey: 'Name', Cell: this.renderEditable},
      {Header: 'eMail Address', width: 300, dataKey: 'Email', Cell: this.renderEditable},
      {Header: 'Access Level', width: 100, dataKey: 'Access', Cell: this.renderAccess}
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
    this.props.dispatch(fetchUsers());
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

  renderHeaderCheckbox = ({dataKey}) => {
    const {userDataMap, selectedUsers} = this.state;
    const {userData} = this.props;
    var checked = userDataMap.length > 0; // not checked if list is empty
    for (var i = 0; i < userDataMap.length; i++) {
      if (selectedUsers.indexOf(userData[userDataMap[i]].UserID) < 0) {
        checked = false;
      }
    }
    return (
      <input type="checkbox"
        checked={checked}
        onChange={e => {
          const {userDataMap} = this.state;
          const {userData} = this.props;

          let selectedUsers = this.state.selectedUsers.slice();
          if (checked) {
            // remove all visible (filtered) UserIDs
            console.log('uncheck all')
            for (let i = 0; i < userDataMap.length; i++) {
              let userId = userData[userDataMap[i]].UserID;
              let j = selectedUsers.indexOf(userId)
              if (j > -1) {
                selectedUsers.splice(j, 1);
              }
            }
          }
          else {
            // insert all visible (filtered) UserIDs if not already present
            console.log('check all')
            for (let i = 0; i < userDataMap.length; i++) {
              let userId = userData[userDataMap[i]].UserID;
              if (selectedUsers.indexOf(userId) < 0) {
                selectedUsers.push(userId)
              }
            }
          }
          this.setState({selectedUsers})
        }}
      />
    );
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
        onClick={e => {
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
    //const userDataIndex = this.state.userDataMap[rowIndex];
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
    const {userData} = this.props;
    const {sortBy, sortDirection} = this.state;

    const filters = update(this.state.filters, {[dataKey]: {$set: event.target.textContent}});

    this.setState({
      filters: filters,
      userDataMap: sortData(filterData(userData, filters), userData, sortBy, sortDirection)
    });
  }
  
  componentDidMount() {
  }

  render() {
    const renderHeaderCell = ({columnData, dataKey, label}) => {

      const sortDirection = this.state.sortDirection[dataKey];
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
      );
    };
    const noRowsRenderer = () => {
      return <div className={styles.noRows}>{this.props.isFetching? 'Loading...': 'No rows'}</div>
    }
    const rowClassName = ({index}) => {
      if (index < 0) {
        return styles.headerRow;
      } else {
        return index % 2 === 0 ? styles.evenRow : styles.oddRow;
      }
    }


    return (
      <div id='Users'>
        {!this.props.isFetching && <button onClick={this.refresh}>Refresh</button>}
        <button onClick={this.showAddModal}>Add</button>
        <button onClick={this.handleRemoveSelected}>Remove Selected</button>
        
        <Table
          className={styles.Table}
          height={400}
          width={600}
          rowHeight={50}
          headerHeight={60}
          noRowsRenderer={noRowsRenderer}
          headerClassName={styles.headerColumn}
          rowClassName={rowClassName}
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
                label={col.Header}
                dataKey={col.dataKey}
                headerRenderer={col.HeaderCell? col.HeaderCell: renderHeaderCell}
                cellRenderer={col.Cell}
              />
            )})}
        </Table>

        <Modal className='ModalContent' overlayClassName='ModalOverlay' isOpen={this.props.updateError} appElement={document.querySelector('#Users')}>
          <p>{this.props.errMsg}</p>
          <button onClick={e => this.props.dispatch(clearError())}>OK</button>
        </Modal>

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
    isFetching: s.isFetching,
    userData: s.data,
    updateError: s.updateError || s.fetchError,
    errMsg: s.errMsg
  }
}
export default connect(mapStateToProps)(Users);
