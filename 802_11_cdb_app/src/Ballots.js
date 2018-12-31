import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import {getBallots, clearGetBallotsError, deleteBallots, clearDeleteBallotsError, updateBallot, clearUpdateBallotError, addBallot, clearAddBallotError} from './actions/ballots';
import {deleteCommentsWithBallotId, importComments, clearImportError} from './actions/comments'
import {filterData, sortData, sortClick, allSelected, toggleVisible} from './filter'
import Epolls from './Epolls'
import styles from './AppTable.css'

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
class Ballots extends React.Component {
  constructor(props) {

    super(props);
  
    this.columns = [
      {Header: '', dataKey: 'isChecked', width: 40, sortable: false, HeaderCell: this.renderHeaderCheckbox, Cell: this.renderCheckbox},
      {Header: 'Ballot Series', dataKey: 'BallotSeries', width: 150, Cell: this.renderEditable},
      {Header: 'Ballot ID', dataKey: 'BallotID', width: 100, Cell: this.renderEditable},
      {Header: 'Topic', dataKey: 'Topic', width: 300, Cell: this.renderEditable},
      {Header: 'ePoll', dataKey: 'EpollNum', width: 80},
      {Header: 'Start', dataKey: 'Start', width: 100},
      {Header: 'End', dataKey: 'End', width: 100},
      {Header: 'Comment Count', dataKey: 'count', width: 80, Cell: this.renderCommentCount}
    ];

    const filters = {
      BallotSeries: '',
      BallotID: '',
      Topic: '',
      EpollNum: ''
    }

    this.state = {
      showOkModal: false,
      modalMessage: '',
      showEpolls: false,
      height: 100,
      width: 100,
      ballotDataMap: [],
      ballotImport: {},
      selectedBallots: [],
      sortBy: [],
      sortDirection: [],
      filters,
    }
  }
  
  static getDerivedStateFromProps(props, state) {
    if (props.ballotData.length !== state.ballotDataMap.length) {
      // rebuild selectedBallots since entries may have been removed
      let selectedBallots = []
      props.ballotData.forEach(b => {
        if (state.selectedBallots.includes(b.BallotID)) {
          selectedBallots.push(b.BallotID)
        }
      })
      const newState = {
        ballotDataMap: sortData(filterData(props.ballotData, state.filters), props.ballotData, state.sortBy, state.sortDirection),
        selectedBallots
      }
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
  showEpolls = (e) => {
    this.setState({showEpolls: true});
    e.preventDefault()
  }
  hideEpolls = () => {
    this.setState({showEpolls: false});
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
  updateBallotData = (ballotData) => {
    this.setState({
      ballotData: ballotData,
      ballotDataMap: sortData(filterData(ballotData, this.ballotFilters), ballotData, this.ballotSortBy, this.ballotSortDirection)
    });
  }

  handleImportChange = (e) => {
    const ballotImport = update(this.state.ballotImport, {[e.target.name]: {$set: e.target.value}});
    this.setState({ballotImport});
  }
  deleteCommentsClick = (e, rowData) => {
    console.log('ballotId=', rowData.BallotID)
    this.props.dispatch(deleteCommentsWithBallotId(rowData.BallotID));
  }
  importCommentsClick = (e, rowData) => {
    this.props.dispatch(importComments(rowData.BallotID, rowData.EpollNum, 1));
  }
  handleRemoveSelected = () => {
    const {ballotData} = this.props;
    const {ballotDataMap} = this.state;
    var delBallotIds = [];
    for (var i = 0; i < ballotDataMap.length; i++) { // only select checked items that are visible
      let ballotId = ballotData[ballotDataMap[i]].BallotID
      if (this.state.selectedBallots.includes(ballotId)) {
        delBallotIds.push(ballotId)
      }
    }
    if (delBallotIds.length) {
      this.props.dispatch(deleteBallots(delBallotIds))
    }
  }
  sortChange = (event, dataKey) => {

    const {sortBy, sortDirection} = sortClick(event, dataKey, this.state.sortBy, this.state.sortDirection);

    this.setState({
      sortBy: sortBy,
      sortDirection: sortDirection,
      ballotDataMap: sortData(this.state.ballotDataMap, this.props.ballotData, sortBy, sortDirection)
    });
  }

  filterChange = (event, dataKey) => {
    const {ballotData} = this.props;
    const {sortBy, sortDirection} = this.state;

    const filters = update(this.state.filters, {[dataKey]: {$set: event.target.textContent}});

    this.setState({
      filters: filters,
      ballotDataMap: sortData(filterData(ballotData, filters), ballotData, sortBy, sortDirection)
    });
  }
  updateBallotField = (rowIndex, dataKey, fieldData) => {
    const b = this.props.ballotData[this.state.ballotDataMap[rowIndex]];
    this.props.dispatch(updateBallot({
        BallotID: b.BallotID,
        [dataKey]: fieldData
      }));
  }

  updateBallotFieldIfChanged = (rowIndex, dataKey, fieldData) => {
    const b = this.props.ballotData[this.state.ballotDataMap[rowIndex]];
    if (b[dataKey] !== fieldData) {
      this.props.dispatch(updateBallot({
        BallotID: b.BallotID,
        [dataKey]: fieldData
      }));
    }
  }

  renderHeaderCheckbox = ({dataKey}) => {
    const {ballotDataMap, selectedBallots} = this.state;
    const {ballotData} = this.props;
    const checked = allSelected(selectedBallots, ballotDataMap, ballotData, 'BallotID');
    return (
      <input type="checkbox"
        checked={checked}
        onChange={e => {
          this.setState({selectedBallots: toggleVisible(selectedBallots, ballotDataMap, ballotData, 'BallotID')})
        }}
      />
    );
  }
  renderCheckbox = ({rowIndex, rowData, dataKey}) => {
    const ballotId = rowData.BallotID;
    return (
      <input type="checkbox"
        checked={this.state.selectedBallots.indexOf(ballotId) >= 0}
        onClick={e => {
          // if commentId is present in selectedComments (i > 0) then remove it; otherwise add it
          let i = this.state.selectedBallots.indexOf(ballotId);
          this.setState({
            selectedBallots: update(this.state.selectedBallots, (i > -1)? {$splice: [[i, 1]]}: {$push: [ballotId]})
          })
        }}
      />
    );
  }
  renderEditable = ({rowIndex, rowData, dataKey}) => {
    return (
      <div
        contentEditable
        onBlur={e => {
          this.updateBallotFieldIfChanged(rowIndex, dataKey, e.target.innerHTML)
        }}
        dangerouslySetInnerHTML={{__html: rowData[dataKey]}}
      />
    );
  }
  renderCommentCount = ({rowIndex, rowData, dataKey}) => {
    var count = rowData.count;
    if (count > 0) {
      return (
        <div>
          <span>{count}</span>
          <button onClick={(e) => {return this.deleteCommentsClick(e, rowData)}}>Delete</button>
        </div>
        )
    }
    else {
      return (
        <button onClick={(e) => {return this.importCommentsClick(e, rowData)}}>Import</button>
        )
    }
  }

  refresh = () => {
    this.props.dispatch(getBallots());
  }

  componentDidMount() {
    var wrapper = document.getElementById('Ballots');
    this.setState({height: wrapper.offsetHeight - 19, width: wrapper.offsetWidth})
  }

  renderOkModal = () => {
    const open = this.props.getBallotsError
      || this.props.updateBallotError
      || this.props.deleteBallotsError
      || this.props.importState.error

    var msg = this.props.errMsg;
    var dispatchObj = null
    if (this.props.getBallotsError) {
      msg = this.props.getBallotsMsg
      dispatchObj = clearGetBallotsError()
    }
    else if (this.props.updateBallotError) {
      msg = this.props.updateBallotMsg
      dispatchObj = clearUpdateBallotError()
    }
    else if (this.props.deleteBallotsError) {
      msg = this.props.deleteBallotsMsg
      dispatchObj = clearDeleteBallotsError()
    }
    else if (this.props.importState.error) {
      msg = this.props.importState.errorMsg
      dispatchObj = clearImportError()
    }

    return (
      <Modal
        className='ModalContent'
        overlayClassName='ModalOverlay'
        isOpen={open}
        appElement={document.querySelector('#Ballots')}
      >
        <p>{msg}</p>
        <button onClick={() => this.props.dispatch(dispatchObj)}>OK</button>
      </Modal>
    )
  }

  render() {
    const renderTable = () => {
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
      }
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
        <Table
          className={styles.Table}
          height={this.state.height}
          width={this.state.width}
          rowHeight={54}
          headerHeight={60}
          noRowsRenderer={noRowsRenderer}
          headerClassName={styles.headerColumn}
          rowClassName={rowClassName}
          rowCount={this.state.ballotDataMap.length}
          rowGetter={({index}) => {return this.props.ballotData[this.state.ballotDataMap[index]]}}
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
                flexGrow={col.hasOwnProperty('flexGrow')? col.flexGrow: 0}
                flexShrink={col.hasOwnProperty('flexShrink')? col.flexShrink: 1}
              />
            )})}
        </Table>
      )
    }
    return (
      <div id='Ballots' style={{height: '100%'}}>
        {this.state.showEpolls?
          (<Epolls close={() => this.setState({showEpolls: false})} />):
          (<div>
            <button onClick={this.refresh}>Refresh</button>
            <button>Add</button>
            <button onClick={this.handleRemoveSelected}>Remove Selected</button>
            <button onClick={this.showEpolls}>Import ePoll</button>
            {renderTable()}
            {this.renderOkModal()}
          </div>)
        }
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    ballotData: state.ballots.ballotData,
    getBallots: state.ballots.getBallots,
    getBallotsError: state.ballots.getBallotsError,
    getBallotsMsg: state.ballots.getBallotsMsg,
    updateBallot: state.ballots.updateBallot,
    updateBallotError: state.ballots.updateBallotError,
    updateBallotMsg: state.ballots.updateBallotMsg,
    importState: state.comments.importState,
    errMsg: state.comments.errMsg,
    deleteBallots: state.ballots.deleteBallots,
    deleteBallotsError: state.ballots.deleteBallotsError,
    deleteBallotsMsg: state.ballots.deleteBallotsMsg
  }
}
export default connect(mapStateToProps)(Ballots);