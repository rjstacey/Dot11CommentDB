import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import {filterData, sortData, sortClick} from './filter'
import {getEpolls, clearGetEpollsError, addBallot, clearAddBallotError} from './actions/ballots';
import './Epolls.css'
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

class Epolls extends React.Component {
	constructor(props) {
		super(props)
  
		this.columns = [
			{Header: '', dataKey: 'Import', width: 100, sortable: false, Cell: this.renderImport},
			{Header: 'ePoll', dataKey: 'EpollNum', width: 100, sortable: true},
			{Header: 'ePoll Name', dataKey: 'BallotID', width: 100, sortable: true},
			{Header: 'Topic', dataKey: 'Topic', width: 500, sortable: true},
			{Header: 'Start', dataKey: 'Start', width: 100, sortable: true},
			{Header: 'End', dataKey: 'End', width: 100, sortable: true},
			{Header: 'Result', dataKey: 'Votes', width: 100, sortable: true},
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
		this.props.dispatch(getEpolls());
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
	componentDidMount() {
  	var wrapper = document.getElementById('Epolls');
  	this.setState({height: wrapper.offsetHeight - 19, width: wrapper.offsetWidth})
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
        return <div className={styles.noRows}>{this.props.getEpolls? 'Loading...': 'No rows'}</div>
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
          rowCount={this.state.epollDataMap.length}
          rowGetter={({index}) => {return this.props.epollData[this.state.epollDataMap[index]]}}
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
      <div id='Epolls' style={{height: '100%'}}>
        <button onClick={this.props.close}>Back</button>
        <button onClick={this.refresh}>Refresh</button>

        {renderTable()}

        <Modal
          className='OkModalContent'
          overlayClassName='OkModalOverlay'
          isOpen={this.props.getEpollsError || this.props.addBallotError}
          appElement={document.querySelector('#Epolls')}
        >
          <p>{this.props.getEpollsError? this.props.getEpollsMsg: this.props.addBallotError}</p>
          <button onClick={e => this.props.dispatch(this.props.getEpollsError? clearGetEpollsError(): clearAddBallotError())}>OK</button>
        </Modal>

        <Modal 
          className='ImportModalContent'
          overlayClassName='ImportModalOverlay'
          isOpen={this.state.showImportModal}
          appElement={document.querySelector('#Epolls')}
        >
          <label>ePoll:<input type='text' name='EpollNum' value={this.state.ballotImport.EpollNum} readOnly /></label><br />
          <label>Ballot Series:<input type='text' name='BallotSeries' value={this.state.ballotImport.BallotSeries} onChange={this.handleImportChange}/></label><br />
          <label>Ballot ID:<input type='text' name='BallotID' value={this.state.ballotImport.BallotID} onChange={this.handleImportChange}/></label><br />
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
    epollData: state.ballots.epollData,
    getEpolls: state.ballots.getEpolls,
    getEpollsError: state.ballots.getEpollsError,
    getEpollsMsg: state.ballots.getEpollsMsg,
    addBallot: state.ballots.addBallot,
    addBallotError: state.ballots.addBallotError,
    addBallotMsg: state.addBallotMsg
  }
}
export default connect(mapStateToProps)(Epolls);
