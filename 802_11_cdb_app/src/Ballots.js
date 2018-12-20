import React from 'react';
import Modal from 'react-modal';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs'; 
import update from 'immutability-helper';
import {AppTable} from './AppTable'
import {filterData, sortData} from './filter'

var axios = require('axios');

export default class Ballots extends React.Component {
  state = {
    showOkModal: false,
    modalMessage: '',
    showImportModal: false,
  	ballotData: [],
    ballotDataMap: [],
    ballotImport: {},
    epollData: [],
    epollDataMap: []
  };
  ballotSortBy = [];
  ballotSortDirection = [];
  ballotFilters = {};
  epollSortBy = [];
  epollSortDirection = [];
  epollFilters = {};

  showOkModal = (msg) => {
    this.setState({showOkModal: true, modalMessage: msg});
  }
  hideOkModal = () => {
    this.setState({showOkModal: false});
  }
  showImportModal = (e, cellInfo) => {
    console.log(cellInfo);
    console.log(this.state.epollData[cellInfo.index]);

    var ballotImport = Object.assign({}, this.state.epollData[cellInfo.index]); // clone
    ballotImport.BallotSeries = '';

    this.setState({showImportModal: true, ballotImport: ballotImport});
  }
  hideImportModal = () => {
    this.setState({showImportModal: false});
  }
  ballotSortFunc = ({sortBy, sortDirection}) => {
    this.ballotSortBy = sortBy;
    this.ballotSortDirection = sortDirection;
    const {ballotDataMap, ballotData} = this.state;
    this.setState({
      ballotDataMap: sortData(ballotDataMap, ballotData, sortBy, sortDirection)
    });
  }
  ballotFiltFunc = ({filters}) => {
    this.ballotFilters = filters;
    const {ballotData} = this.state;
    this.setState({
      ballotDataMap: sortData(filterData(ballotData, filters), ballotData, this.ballotSortBy, this.ballotSortDirection)
    });
  }
  epollSortFunc = ({sortBy, sortDirection}) => {
    this.epollSortBy = sortBy;
    this.epollSortDirection = sortDirection;
    const {epollDataMap, epollData} = this.state;
    this.setState({
      ballotDataMap: sortData(epollDataMap, epollData, sortBy, sortDirection)
    });
  }
  epollFiltFunc = ({filters}) => {
    this.epollFilters = filters;
    const {epollData} = this.state;
    this.setState({
      epollDataMap: sortData(filterData(epollData, filters), epollData, this.epollSortBy, this.epollSortDirection)
    });
  }
  updateEpollData = (epollData) => {
    this.setState({
      epollData: epollData,
      epollDataMap: sortData(filterData(epollData, this.epollFilters), epollData, this.epollSortBy, this.epollSortDirection)
    });
  }
  getEpolls = () => {
    axios.get('/epolls')
      .then((response) => {
          if (response.data.status !== 'OK') {
            this.showOkModal(response.data.message);
          }
          else {
            console.log(response.data.data);
            this.updateEpollData(response.data.data);
          }
        })
      .catch((error) => {
          this.showOkModal('Unable to get epoll list');
        });
  }
  updateBallotData = (ballotData) => {
    this.setState({
      ballotData: ballotData,
      ballotDataMap: sortData(filterData(ballotData, this.ballotFilters), ballotData, this.ballotSortBy, this.ballotSortDirection)
    });
  }
  getBallots = () => {
    axios.get('/ballots')
      .then((response) => {
          if (response.data.status !== 'OK') {
            this.showModal(response.data.message);
          }
          else {
            const newBallotData = response.data.data;
            console.log(newBallotData);
            var ballotData = [];
            newBallotData.forEach(i => {
              ballotData.push({isChecked: false, ...i})
            })
            this.updateBallotData(ballotData);
          }
        })
      .catch((error) => {
          this.showOkModal('Unable to get ballots list');
        });
  }
  handleImportChange = (e) => {
    const ballotImport = update(this.state.ballotImport, {[e.target.name]: {$set: e.target.value}});
    this.setState({ballotImport});
  }
  importBallot = (e) => {
    this.setState({showImportModal: false})
    console.log(this.state.ballotImport)
    axios.put('/ballots', this.state.ballotImport)
      .then((response) => {
        if (response.data.status !== 'OK') {
          console.log(response.data.message);
          this.showOkModal(response.data.message);
        }
        else {
          const i = response.data.data;
          console.log(i);
          var ballotData = this.state.ballotData.slice();
          ballotData.push({isChecked: false, ...i});
          this.updateBallotData(ballotData);
        }
      })
      .catch((error) => {
          this.showOkModal(`Unable to import epoll: ${error}`);
      });
    e.preventDefault();
  }
  deleteComments = (e, cellInfo) => {
    var ballotId = this.state.ballotData[this.state.ballotDataMap[cellInfo.index]].BallotID;
    axios.delete('/comments/BallotID', {data: {BallotID: ballotId}})
      .then((response) => {
        if (response.data.status !== 'OK') {
          console.log(response.data.message);
          this.showOkModal(response.data.message);
        }
        else {
          const mIndex = this.state.ballotDataMap[cellInfo.index];
          this.setState({
            ballotData: update(this.state.ballotData, {[mIndex]: {count: {$set: 0}}})
          });
        }
      })
      .catch((error) => {
          this.showOkModal(`Unable to delete comments for BallotID=${ballotId}: ${error}`);
      });
  }
  importComments = (e, cellInfo) => {
    const ballot = this.state.ballotData[this.state.ballotDataMap[cellInfo.index]];
    axios.put('/comments/import', {EpollNum: ballot.epollNum, BallotID: ballot.BallotID, StartCID: 100})
      .then((response) => {
        if (response.data.status !== 'OK') {
          console.log(response.data.message);
          this.showOkModal(response.data.message);
        }
        else {
          const count = response.data.data.count;
          const mIndex = this.state.ballotDataMap[cellInfo.index];
          console.log('New count=', count);
          this.setState({
            ballotData: update(this.state.ballotData, {[mIndex]: {count: {$set: count}}})
          });
        }
      })
      .catch((error) => {
          this.showOkModal(`Unable to import comments for epoll=${ballot.epollNum}: ${error}`);
      });
  }
  handleRowCheckbox = (row, event) => {
    const ballotData = this.state.ballotData;
    ballotData[row.index].isChecked = event.target.checked;
    this.setState({ballotData: ballotData});
  }
  getBallotRow = ({index}) => {
    return this.state.ballotData[index];
  }
  getEpollRow = ({index}) => {
    return this.state.epollData[index];
  }
  handleRemoveSelected = () => {
    const {ballotDataMap, ballotData} = this.state;
    var delBallotIds = [];
    for (var i = 0; i < ballotDataMap.length; i++) { // only select checked items that are visible
      if (ballotData[ballotDataMap[i]].isChecked) {
        delBallotIds.push(ballotData[ballotDataMap[i]].BallotID)
      }
    }
    if (delBallotIds.length) {
      axios.delete('/ballots', {data: delBallotIds})
        .then((response) => {
          if (response.data.status !== 'OK') {
            this.showOkModal(response.data.message);
          }
          else {
            this.getBallots();
          }
        })
        .catch((error) => {
          this.showOkModal('Unable to delete ballots');
        });
      }
  }
  renderCheckbox = (cellInfo) => {
    const mIndex = this.state.ballotDataMap[cellInfo.index];
    return (
      <input type="checkbox"
        checked={this.state.ballotData[mIndex][cellInfo.column.id]}
        onChange={e => {
          this.setState({
            ballotData: update(this.state.ballotData, {[mIndex]: {[cellInfo.column.id]: {$set: e.target.checked}}})
          })
        }}
      />
    );
  }
  renderEditable = (cellInfo) => {
    const mIndex = this.state.ballotDataMap[cellInfo.index];
    return (
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={e => {
          this.setState({
            ballotData: update(this.state.ballotData, {[mIndex]: {[cellInfo.column.id]: {$set: e.target.innerHTML}}})
          });
        }}
        dangerouslySetInnerHTML={{__html: this.state.ballotData[mIndex][cellInfo.column.id]}}
      />
    );
  }
  renderImport = (cellInfo) => {
    var imported = this.state.epollData[this.state.epollDataMap[cellInfo.index]].InDatabase;

    if (imported) {
      return null;
    }
    else {
      return (
        <button onClick={(e) => {return this.showImportModal(e, cellInfo)}}>Import</button>
      );
    }
  }
  renderCommentCount = (cellInfo) => {
    var count = this.state.ballotData[this.state.ballotDataMap[cellInfo.index]].count;
    if (count > 0) {
      return (
        <div>
          <span>{count}</span>
          <button onClick={(e) => {return this.deleteComments(e, cellInfo)}}>Delete</button>
        </div>
        )
    }
    else {
      return (
        <button onClick={(e) => {return this.importComments(e, cellInfo)}}>Import</button>
        )
    }
  }

  componentDidMount() {
    this.getBallots();
  }

  render() {
  	const ballotColumns = [
      {Header: '', dataKey: 'isChecked', width: 40, sortable: false, filterable: false, Cell: this.renderCheckbox},
      {Header: 'Ballot Series', dataKey: 'BallotSeries', width: 150, filterable: true, Cell: this.renderEditable},
      {Header: 'Ballot ID', dataKey: 'BallotID', width: 100, filterable: true, Cell: this.renderEditable},
      {Header: 'Topic', dataKey: 'Topic', width: 300, filterable: true, Cell: this.renderEditable},
      {Header: 'ePoll', dataKey: 'epollNum', width: 80, filterable: true},
      {Header: 'Start', dataKey: 'Start', width: 100},
      {Header: 'End', dataKey: 'End', width: 100},
      {Header: 'Comment Count', dataKey: 'count', width: 80, filterable: false, Cell: this.renderCommentCount}
    ];
    const epollColumns = [
      {Header: '', dataKey: 'Import', width: 100, sortable: false, Cell: this.renderImport},
      {Header: 'ePoll', dataKey: 'EpollNum', width: 100},
      {Header: 'Ballot ID', dataKey: 'BallotID', width: 100},
      {Header: 'Topic', dataKey: 'Topic', width: 500},
      {Header: 'Start', dataKey: 'Start', width: 100},
      {Header: 'End', dataKey: 'End', width: 100},
      {Header: 'Result', dataKey: 'Votes', width: 100},
    ];
    return (
      <div id='Ballots'>
        <Tabs
          className="Tabs"
          selectedTabClassName="Tabs_Tab--selected"
          disabledTabClassName="Tabs_Tab--disabled"
          selectedTabPanelClassName="Tabs_TabPanel--selected"
          forceRenderTabPanel={true}>
          <TabList className="Tabs_TabList">
            <Tab className="Tabs_Tab">Ballots</Tab>
            <Tab className="Tabs_Tab">ePolls</Tab>
          </TabList>
          <TabPanel className="Tabs_TabPanel">
            <button onClick={this.getBallots}>Refresh</button>
            <button>Add</button>
            <button onClick={this.handleRemoveSelected}>Remove Selected</button>
            <AppTable 
              //style={{position: 'relative', top: '32px', bottom: '18px', left: 0, right: 0}}
              rowCount={this.state.ballotDataMap.length}
              rowGetter={({index}) => {return this.state.ballotData[this.state.ballotDataMap[index]]}}
              columns={ballotColumns}
              sortFunc={this.ballotSortFunc}
              filtFunc={this.ballotFiltFunc} />
          </TabPanel>
          <TabPanel className="Tabs_TabPanel">
            <button onClick={this.getEpolls}>Short List</button>
            <button>Long List</button>
            <AppTable
              //style={{position: 'relative', top: '32px', bottom: '18px', left: 0, right: 0}}
              rowCount={this.state.epollDataMap.length}
              rowGetter={({index}) => {return this.state.epollData[this.state.epollDataMap[index]]}}
              columns={epollColumns}
              sortFunc={this.epollSortFunc}
              filtFunc={this.epollFiltFunc} />
          </TabPanel>
        </Tabs>

        <Modal className='ModalContent' overlayClassName='ModalOverlay' isOpen={this.state.showOkModal} appElement={document.querySelector('#Ballots')}>
          <p>{this.state.modalMessage}</p>
          <button onClick={this.hideOkModal}>OK</button>
        </Modal>

        <Modal className='ModalContent' overlayClassName='ModalOverlay' isOpen={this.state.showImportModal} appElement={document.querySelector('#Ballots')}>
          <form className='content' onSubmit={this.handleImportSubmit}>
            <label>Ballot Series:<input type='text' name='BallotSeries' value={this.state.ballotImport.BallotSeries} onChange={this.handleImportChange}/></label><br />
            <label>Ballot ID:<input type='text' name='BallotID' value={this.state.ballotImport.BallotID} onChange={this.handleImportChange}/></label><br />
            <label>Topic:<input type='text' name='Topic' value={this.state.ballotImport.Topic} onChange={this.handleImportChange}/></label><br />
            <label>Start:<input type='text' name='Start' value={this.state.ballotImport.Start} onChange={this.handleImportChange}/></label><br />
            <label>End:<input type='text' name='End' value={this.state.ballotImport.End} onChange={this.handleImportChange}/></label><br />
            <label>Result:<input type='text' name='Votes' value={this.state.ballotImport.Votes} onChange={this.handleImportChange}/></label><br />
            <label>epollNum:<input type='text' name='epollNum' value={this.state.ballotImport.EpollNum} onChange={this.handleImportChange}/></label><br />
            <button type='submit' onClick={this.importBallot}>Import</button>
            <button onClick={this.hideImportModal}>Cancel</button>
          </form>
        </Modal>

      </div>
    )
  }
}