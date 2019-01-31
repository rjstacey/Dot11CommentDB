import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import {filterData, sortData, sortClick, SortIndicator} from './filter'
import {getEpolls, clearGetEpollsError, addBallot, clearAddBallotError} from './actions/ballots';
import './Epolls.css'
import styles from './AppTable.css'

class Epolls extends React.Component {
	constructor(props) {
		super(props)
  
		this.columns = [
			{dataKey: 'Import',    width: 100, label: '',
        sortable: false,
        cellRenderer: this.renderImport},
			{dataKey: 'EpollNum',  width: 100, label: 'ePoll',
        cellRenderer: this.renderText},
			{dataKey: 'BallotID',  width: 100, label: 'ePoll Name',
        cellRenderer: this.renderText},
      {dataKey: 'Document',  width: 300, label: 'Document',
        cellRenderer: this.renderText},
			{dataKey: 'Topic',     width: 500, label: 'Topic',
        cellRenderer: this.renderText},
			{dataKey: 'Start',     width: 100, label: 'Start'},
			{dataKey: 'End',       width: 100, label: 'End'},
			{dataKey: 'Votes',     width: 100, label: 'Result'},
		];

		const filters = {
			BallotID: '',
			Topic: '',
			Start: '',
			End: ''
		}

		this.state = {
      showImportModal: false,
      ballotImportWait: false,
			ballotImport: {},
      epollDataMap: [],
			height: 100,
			width: 100,
			sortBy: [],
			sortDirection: [],
			filters
		}

    this.lastRenderedWidth = this.state.width;
    this.rowHeightCache = new CellMeasurerCache({
      minHeight: 18,
      fixedWidth: true
    })
	}
  
	static getDerivedStateFromProps(props, state) {
		//console.log(props.epollData)
    var newState = {}
		if (props.epollData.length !== state.epollDataMap.length) {
			Object.assign(newState, {
				epollDataMap: sortData(filterData(props.epollData, state.filters), props.epollData, state.sortBy, state.sortDirection)
      })
		}
    if (state.ballotImportWait && !props.addBallot) {
      Object.assign(newState, {ballotImportWait: false})
      if (!props.addBallotError) {
        Object.assign(newState, {showImportModal: false})
      }
    }
		return newState
	}


  importClick = (rowData) => {
    this.setState(
    {
      showImportModal: true,
      ballotImport: Object.assign({}, rowData)
    })
  }
  hideImportModal = () => {
    this.setState({showImportModal: false});
  }
  handleImportChange = (e) => {
    this.setState({ballotImport: Object.assign({}, this.state.ballotImport, {[e.target.name]: e.target.value})})
  }
  importEpolls = (e) => {
    this.props.dispatch(addBallot(this.state.ballotImport))
    this.setState({ballotImportWait: true})
  }
  refresh = () => {
		this.props.dispatch(getEpolls(20))
	}
  sortChange = (event, dataKey) => {

    const {sortBy, sortDirection} = sortClick(event, dataKey, this.state.sortBy, this.state.sortDirection);

    this.setState({
      sortBy: sortBy,
      sortDirection: sortDirection,
      epollDataMap: sortData(this.state.epollDataMap, this.props.epollData, sortBy, sortDirection)
    });
  }

  filterChange = (event, dataKey) => {
    const {epollData} = this.props;
    const {sortBy, sortDirection} = this.state;

    const filters = update(this.state.filters, {[dataKey]: {$set: event.target.textContent}});

    this.setState({
      filters: filters,
      epollDataMap: sortData(filterData(epollData, filters), epollData, sortBy, sortDirection)
    });
  }

  renderImport = ({rowData}) => {
    if (rowData.InDatabase) {
      return (
        <span>Already Present</span>
        )
    } else {
      return (
        <button onClick={e => {this.importClick(rowData)}}>Import</button>
        )
    }
  }

  renderText = ({rowIndex, rowData, dataKey, columnIndex}) => {
    return (
      <div
        dangerouslySetInnerHTML={{__html: rowData[dataKey]}}
      />
    )
  }

  renderMeasuredCell = ({rowIndex, rowData, dataKey, columnIndex, columnData, parent}) => {
    return (
      <CellMeasurer
        cache={this.rowHeightCache}
        rowIndex={rowIndex}
        columnIndex={columnIndex}
        parent={parent}
        key={dataKey}
      >
        {columnData.cellRenderer({rowIndex, rowData, dataKey, columnIndex, parent})}
      </CellMeasurer>
    )
  }

	componentDidMount() {
  	var wrapper = document.getElementById('Epolls');
  	this.setState({height: wrapper.offsetHeight - 19, width: wrapper.offsetWidth});

    if (!this.props.epollDataValid) {
      this.props.dispatch(getEpolls(20))
    }
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
    );
  }

  noRowsRenderer = () => {
    return <div className={styles.noRows}>{this.props.getEpolls? 'Loading...': 'No rows'}</div>
  }

  rowClassName = ({index}) => {
    if (index < 0) {
      return styles.headerRow;
    } else {
      return index % 2 === 0 ? styles.evenRow : styles.oddRow;
    }
  }

  renderTable = () => {
    if (this.lastRenderedWidth !== this.state.width) {
      this.lastRenderedWidth = this.state.width
      this.rowHeightCache.clearAll()
    }
    //console.log(this.props.epollData)
    return (
      <Table
        className={styles.Table}
        height={this.state.height}
        width={this.state.width}
        rowHeight={this.rowHeightCache.rowHeight}
        deferredMeasurementCache={this.rowHeightCache}
        headerHeight={60}
        noRowsRenderer={this.noRowsRenderer}
        headerClassName={styles.headerColumn}
        rowClassName={this.rowClassName}
        rowCount={this.state.epollDataMap.length}
        rowGetter={({index}) => this.props.epollData[this.state.epollDataMap[index]]}
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
              headerRenderer={col.HeaderCell? col.HeaderCell: this.renderHeaderCell}
              cellRenderer={col.cellRenderer? this.renderMeasuredCell: undefined}
              flexGrow={col.hasOwnProperty('flexGrow')? col.flexGrow: 0}
              flexShrink={col.hasOwnProperty('flexShrink')? col.flexShrink: 1}
            />
          )})}
      </Table>
    )
  }

  renderOkModal = () => {
    const open = this.props.getEpollsError
      || this.props.addBallotError

    var msg = 'Something wrong';
    var dispatchObj = null
    if (this.props.getEpollsError) {
      msg = this.props.getEpollsMsg
      dispatchObj = clearGetEpollsError()
    }
    else if (this.props.addBallotError) {
      msg = this.props.addBallotMsg
      dispatchObj = clearAddBallotError()
    }

    return (
      <Modal
        className='OkModalContent'
        overlayClassName='OkModalOverlay'
        isOpen={open}
        appElement={document.querySelector('#Epolls')}
      >
        <p>{msg}</p>
        <button onClick={() => this.props.dispatch(dispatchObj)}>OK</button>
      </Modal>
    )
  }

	render() {

    return (
      <div id='Epolls' style={{height: '100%'}}>
        <button onClick={this.props.close}>Back</button>
        <button onClick={this.refresh}>Refresh</button>

        {this.renderTable()}

        {this.renderOkModal()}

        <Modal 
          className='ImportModalContent'
          overlayClassName='ImportModalOverlay'
          isOpen={this.state.showImportModal}
          appElement={document.querySelector('#Epolls')}
        >
          <label>ePoll:<input type='text' name='EpollNum' value={this.state.ballotImport.EpollNum} readOnly /></label><br />
          <label>Ballot ID:<input type='text' name='BallotID' value={this.state.ballotImport.BallotID} onChange={this.handleImportChange}/></label><br />
          <label>Project:<input type='text' name='Project' value={this.state.ballotImport.Project} onChange={this.handleImportChange}/></label><br />
          <label>Document:<input type='text' name='Document' value={this.state.ballotImport.Document} onChange={this.handleImportChange}/></label><br />
          <label>Topic:<input type='text' name='Topic' value={this.state.ballotImport.Topic} onChange={this.handleImportChange}/></label><br />
          <label>Start:<input type='text' name='Start' value={this.state.ballotImport.Start} onChange={this.handleImportChange}/></label><br />
          <label>End:<input type='text' name='End' value={this.state.ballotImport.End} onChange={this.handleImportChange}/></label><br />
          <label>Result:<input type='text' name='Votes' value={this.state.ballotImport.Votes} onChange={this.handleImportChange}/></label><br />
          <button type='submit' onClick={this.importEpolls}>Import</button>
          <button onClick={this.hideImportModal}>Cancel</button>
        </Modal>

      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    epollDataValid: state.ballots.epollDataValid,
    epollData: state.ballots.epollData,
    getEpolls: state.ballots.getEpolls,
    getEpollsError: state.ballots.getEpollsError,
    getEpollsMsg: state.ballots.getEpollsMsg,
    addBallot: state.ballots.addBallot,
    addBallotError: state.ballots.addBallotError,
    addBallotMsg: state.ballots.addBallotMsg
  }
}
export default connect(mapStateToProps)(Epolls);
