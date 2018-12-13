import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {AppTable} from './AppTable'
import {filterData, sortData} from './filter'


var axios = require('axios');

export default class Users extends React.Component {
  state = {
    showOkModal: false,
    showAddModal: false,
    modalMessage: '',
    userData: [],
    userDataMap: [],
    userAdd: {SAPIN: '', Name: '', Email: '', Access: 3},
  }
  sortBy = [];
  sortDirection = [];
  filters = {};

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

  sortFunc = ({sortBy, sortDirection}) => {
    this.sortBy = sortBy;
    this.sortDirection = sortDirection;
    const userData = this.state.userData;
    this.setState({
      userDataMap: sortData(this.state.userDataMap, userData, sortBy, sortDirection)
    });
  }
  filtFunc = ({filters}) => {
    this.filters = filters;
    const userData = this.state.userData;
    this.setState({
      userDataMap: sortData(filterData(userData, filters), userData, this.sortBy, this.sortDirection)
    });
  }
  updateUserData = (userData) => {
    this.setState({
      userData: userData,
      userDataMap: sortData(filterData(userData, this.filters), userData, this.sortBy, this.sortDirection)
    });
  }
  updateUsers = () => {
    axios.get('/users')
      .then((response) => {
          if (response.data.status !== 'OK') {
            this.showOkModal(response.data.message);
          }
          else {
            const newUserData = response.data.data;
            console.log(newUserData);
            var userData = [];
            newUserData.forEach(i => {
              userData.push({isChecked: false, ...i})
            })
            this.updateUserData(userData);
          }
        })
      .catch((error) => {
          this.showOkModal('Unable to get users list');
        });
  }
  handleUserAddChange = (e) => {
    const userAdd = update(this.state.userAdd, {[e.target.name]: {$set: e.target.value}});
    this.setState({userAdd});
  }
  handleUserAddSubmit = (e) => {
    this.setState({showAddModal: false})
    console.log(this.state.userAdd)
    axios.put('/users', this.state.userAdd)
      .then((response) => {
        if (response.data.status !== 'OK') {
            console.log(response.data.message);
            this.showOkModal(response.data.message);
          }
          else {
            const i = response.data.data;
            console.log(i);
            var userData = this.state.userData.slice();
            userData.push({isChecked: false, ...i});
            this.updateUserData(userData);
          }
      })
      .catch((error) => {
          this.showOkModal('Unable to add user');
      });
    e.preventDefault();
  }

  handleRemoveSelected = () => {
    const {userDataMap, userData} = this.state;
    var delUserIds = [];
    for (var i = 0; i < userDataMap.length; i++) { // only select checked items that are visible
      if (userData[userDataMap[i]].isChecked) {
        delUserIds.push(userData[userDataMap[i]].UserID)
      }
    }
    if (delUserIds.length) {
        axios.delete('/users', {data: delUserIds})
          .then((response) => {
            if (response.data.status !== 'OK') {
              this.showOkModal(response.data.message);
            }
            else {
              this.updateUsers();
              //this.showOkModal('Users deleted');
            }
          })
          .catch((error) => {
            this.showOkModal('Unable to delete users');
          });
      }
  }

  renderHeaderCheckbox = ({dataKey}) => {
    const {userDataMap, userData} = this.state;
    var checked = userDataMap.length > 0; // not checked if list is empty
    for (var i = 0; i < userDataMap.length; i++) {
      if (!userData[userDataMap[i]].isChecked) {
        checked = false;
      }
    }
    return (
      <input type="checkbox"
        checked={checked}
        onChange={e => {
          const checked = e.target.checked;
          const userDataMap = this.state.userDataMap;
          var userData = this.state.userData.slice();
          for (var i = 0; i < userDataMap.length; i++) {
            userData[userDataMap[i]][dataKey] = checked;
          }
          this.setState({userData})
        }}
      />
    );
  }

  renderEditable = (cellInfo) => {
    const userDataIndex = this.state.userDataMap[cellInfo.index];
    return (
      <div
        contentEditable
        onBlur={e => {
          this.setState({
            userData: update(this.state.userData, {[userDataIndex]: {[cellInfo.column.id]: {$set: e.target.innerHTML}}})
          });
        }}
        dangerouslySetInnerHTML={{__html: this.state.userData[userDataIndex][cellInfo.column.id]}}
      />
    );
  }

  renderCheckbox = (cellInfo) => {
    const userDataIndex = this.state.userDataMap[cellInfo.index];
    return (
      <input type="checkbox"
        checked={this.state.userData[userDataIndex][cellInfo.column.id]}
        onChange={e => {
          this.setState({
            userData: update(this.state.userData, {[userDataIndex]: {[cellInfo.column.id]: {$set: e.target.checked}}})
          })
        }}
      />
    );
  }

  renderAccess = (cellInfo) => {
    const userDataIndex = this.state.userDataMap[cellInfo.index];
    return (
      <select 
        value={this.state.userData[userDataIndex][cellInfo.column.id]}
        onChange={e => {
          this.setState({
            userData: update(this.state.userData, {[userDataIndex]: {[cellInfo.column.id]: {$set: e.target.value}}})
          });
        }}>
        <option value='1'>Basic</option>
        <option value='2'>Plus</option>
        <option value='3'>Super</option>
      </select>
    )
  }

  componentDidMount() {
    this.updateUsers();
  }

  render() {
    const columns = [
      {Header: '', width: 40, dataKey: 'isChecked', sortable: false, filterable: false, HeaderCell: this.renderHeaderCheckbox, Cell: this.renderCheckbox},
      {Header: 'SA PIN', width: 80, dataKey: 'SAPIN', filterable: false, Cell: this.renderEditable},
      {Header: 'Name', width: 300, dataKey: 'Name', filterable: true, Cell: this.renderEditable},
      {Header: 'eMail Address', width: 300, dataKey: 'Email', filterable: true, Cell: this.renderEditable},
      {Header: 'Access Level', width: 100, dataKey: 'Access', filterable: false, Cell: this.renderAccess}
    ];
    return (
      <div id='Users'>
        <button onClick={this.updateUsers}>Refresh</button>
        <button onClick={this.showAddModal}>Add</button>
        <button onClick={this.handleRemoveSelected}>Remove Selected</button>
        
        <AppTable
          style={{position: 'absolute', top: '32px', bottom: '18px', left: 0, right: 0}}
          rowCount={this.state.userDataMap.length}
          columns={columns}
          sortFunc={this.sortFunc}
          filtFunc={this.filtFunc}
          rowGetter={({index}) => {return this.state.userData[this.state.userDataMap[index]]}} />

        <Modal className='ModalContent' overlayClassName='ModalOverlay' isOpen={this.state.showOkModal} appElement={document.querySelector('#Users')}>
          <p>{this.state.modalMessage}</p>
          <button onClick={this.hideOkModal}>OK</button>
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