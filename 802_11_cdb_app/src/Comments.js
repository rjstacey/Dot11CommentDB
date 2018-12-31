import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import LinesEllipsis from 'react-lines-ellipsis'
import CommentDetail from './CommentDetail'
import {filterData, sortData, sortClick, allSelected, toggleVisible} from './filter'
import {fetchComments, updateComment, clearError} from './actions/comments'
import styles from './AppTable.css';


import './Comments.css'

var axios = require('axios');

function ExpandIcon(props) {
  const {showPlus, ...otherProps} = props;
  return (<svg width={18} height={18} {...otherProps}>
    <g stroke='black'>
      <circle cx={9} cy={9} r={8} strokeWidth={1} fill='none'/>
      <path
        d={showPlus? 'M 4,9 h 10 M 9,4 v 10': 'M 4,9 h 10'}
        strokeWidth={2}
        strokeLinecap='round'
      />
    </g>
  </svg>)
}

function html_preserve_newline(text) {
  return text.split('\n').map((line, i, arr) => {
    const lline = <span key={i}>{line}</span>;
    if (i === arr.length - 1) {
      return lline;
    } else {
      return [lline, <br key={i + 'br'} />];
    }
  })
}
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
class Comments extends React.Component {
  constructor(props) {
    super(props);


    this.users = [];

    this.columns = [
      {Header: '', width: 60, flexGrow: 0, flexShrink: 0, dataKey: 'isChecked', sortable: false, HeaderCell: this.renderHeaderCheckbox, Cell: this.renderCheckbox},
      {Header: 'CID', width: 60, flexGrow: 0, flexShrink: 0, dataKey: 'CommentID'},
      {Header: 'Commenter', width: 150, flexGrow: 0, flexShrink: 0, dataKey: 'Commenter'},
      {Header: 'Must Satisfy', width: 80, flexGrow: 0, flexShrink: 0, dataKey: 'MustSatisfy'},
      {Header: 'Category', width: 80, flexGrow: 0, flexShrink: 0, dataKey: 'Category'},
      {Header: 'Clause', width: 100, flexGrow: 0, flexShrink: 0, dataKey: 'Clause'},
      {Header: 'Page', width: 100, flexGrow: 0, flexShrink: 0, dataKey: 'Page'},
      {Header: 'Comment', width: 400, flexGrow: 1, flexShrink: 1, dataKey: 'Comment', Cell: this.renderMultiline},
      {Header: 'Proposed Change', width: 400, flexGrow: 1, flexShrink: 1, dataKey: 'ProposedChange', Cell: this.renderMultiline},
    ];

    // List of filterable columns
    const filters = {
      Commenter: '',
      MustSatisfy: '',
      Category: '',
      Clause: '',
      Page: '',
      Comment: '',
      ProposedChange: ''
    };

    this.state = {
      showOkModal: false,
      modalMessage: '',

      editIndex: 0,

      commentDataMap: [],
      selectedComments: [],
      expandedComments: [],
      expandAll: false,

      ballots: [],
      ballotId: '',

      sortBy: [],
      sortDirection: {},
      filters,

      height: 500,
      width: 600
    }

    this.cache = new CellMeasurerCache({
      defaultHeight: 54,
      fixedWidth: true
    })

    this.clearCachedRowHeight.bind()
    this.clearAllCachedRowHeight.bind()
  }

  static getDerivedStateFromProps(props, state) {
    if (props.commentData.length !== state.commentDataMap.length) {
      const newState = {
        commentDataMap: sortData(filterData(props.commentData, state.filters), props.commentData, state.sortBy, state.sortDirection)
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
  showAddModal = () => {
    this.setState({showAddModal: true, userAdd: {Name: '', Email: '', Access: 3}});
  }
  hideAddModal = () => {
    this.setState({showAddModal: false});
  }

  sortChange = (event, dataKey) => {

    const {sortBy, sortDirection} = sortClick(event, dataKey, this.state.sortBy, this.state.sortDirection);

    this.setState({
      sortBy: sortBy,
      sortDirection: sortDirection,
      commentDataMap: sortData(this.state.commentDataMap, this.props.commentData, sortBy, sortDirection)
    });
  }

  filterChange = (event, dataKey) => {
    const {commentData} = this.props;
    const {sortBy, sortDirection} = this.state;

    const filters = update(this.state.filters, {[dataKey]: {$set: event.target.textContent}});

    this.setState({
      filters: filters,
      commentDataMap: sortData(filterData(commentData, filters), commentData, sortBy, sortDirection)
    });
  }
  
  getBallots = () => {
    axios.get('/ballots')
      .then((response) => {
          if (response.data.status !== 'OK') {
            this.showModal(response.data.message);
          }
          else {
            const ballotData = response.data.data;
            console.log(ballotData);
            var ballots = [];
            ballotData.forEach(i => {
              var desc = i.BallotSeries + '/' + i.BallotID + ' ' + i.Topic;
              ballots.push({BallotID: i.BallotID, Description: desc.substring(0,32)})
            })
            console.log('ballots=', ballots)
            this.setState({ballots: ballots});
          }
        })
      .catch((error) => {
          this.showOkModal(`Unable to get ballots list: ${error}`);
        });
  }
  handleBallotChange = (e) => {
    var ballotId = e.target.value;
    this.props.dispatch(fetchComments(ballotId));
  }
  getUsers = () => {
    axios.get('/users')
      .then((response) => {
          if (response.data.status !== 'OK') {
            this.showModal(response.data.message);
          }
          else {
            const userData = response.data.data;
            console.log(userData);
            this.users = [];
            userData.forEach(i => {
              this.users.push({UserID: i.UserID, Name: i.Name, Email: i.Email})
            })
            console.log('users=', this.users)
          }
        })
      .catch((error) => {
          this.showOkModal(`Unable to get ballots list: ${error}`);
        });
  }

  renderHeaderCheckbox = ({dataKey}) => {
    const {commentDataMap, selectedComments, expandedComments} = this.state;
    const {commentData} = this.props;
    const checked = allSelected(selectedComments, commentDataMap, commentData, 'CommentID');
    const expanded = allSelected(expandedComments, commentDataMap, commentData, 'CommentID')
    return (
      <div>
      <input type="checkbox"
        checked={checked}
        onChange={e => {
          this.setState({selectedComments: toggleVisible(selectedComments, commentDataMap, commentData, 'CommentID')})
        }}
      />
      <ExpandIcon 
        showPlus={!expanded}
        onClick={e => {
          this.setState({expandedComments: toggleVisible(expandedComments, commentDataMap, commentData, 'CommentID')})
          this.clearAllCachedRowHeight()
        }}
      />
      </div>
    );
  }

  renderEditable = ({rowIndex, rowData, dataKey}) => {
    return (
      <div
        contentEditable
        onBlur={e => {
          this.updateCommentFieldIfChanged(rowIndex, dataKey, e.target.innerHTML)
        }}
        dangerouslySetInnerHTML={{__html: rowData[dataKey]}}
      />
    );
  }

  renderCheckbox = ({rowIndex, rowData, dataKey}) => {
    const commentId = rowData.CommentID;
    return (
      <div>
        <input type="checkbox"
          checked={this.state.selectedComments.indexOf(commentId) >= 0}
          onClick={e => {
            // if commentId is present in selectedComments (i > 0) then remove it; otherwise add it
            let i = this.state.selectedComments.indexOf(commentId);
            this.setState({
              selectedComments: update(this.state.selectedComments, (i > -1)? {$splice: [[i, 1]]}: {$push: [commentId]})
            })
          }}
        />
        <ExpandIcon 
          showPlus={!this.state.expandedComments.includes(commentId)}
          onClick={e => {
            let i = this.state.expandedComments.indexOf(commentId);
            this.setState({
              expandedComments: update(this.state.expandedComments, (i > -1)? {$splice: [[i, 1]]}: {$push: [commentId]})
            })
            this.clearCachedRowHeight(rowIndex)
          }}
        />
      </div>
    );
  }

  renderMultiline = ({rowIndex, rowData, dataKey, columnIndex, parent}) => {
    const commentId = rowData.CommentID;
    const expanded = this.state.expandedComments.includes(commentId);
    console.log('expanded=', expanded, rowIndex, columnIndex)
    return(
      <CellMeasurer
        cache={this.cache}
        columnIndex={columnIndex}
        parent={parent}
        key={dataKey}
        rowIndex={rowIndex}
      >
        <LinesEllipsis
          text={rowData[dataKey]}
          maxLine={expanded? 1000: 3}
          basedOn='letters'
        />
      </CellMeasurer>
    )
  }

  clearCachedRowHeight(rowIndex) {
    // Clear all the column heights in the cache.
    for (var i = 0; i < this.columns.length; i++) {
      this.cache.clear(rowIndex, i)
    }
  }

  clearAllCachedRowHeight() {
    this.cache.clearAll()
  }

  componentDidMount() {
    var wrapper = document.getElementById('Comments');
    this.setState({height: wrapper.offsetHeight - 19, width: wrapper.offsetWidth})
    this.getBallots();
    this.getUsers();
  }

  componentDidUpdate() {
    console.log(this.cache)
  }

  editRow = ({event, index, rowData}) => {
    this.setState({
      editIndex: index,
      showEditModal: true
    })
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
        return <div className={styles.noRows}>{this.props.isFetchingComments? 'Loading...': 'No rows'}</div>
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
          rowHeight={this.cache.rowHeight}
          headerHeight={60}
          noRowsRenderer={noRowsRenderer}
          headerClassName={styles.headerColumn}
          rowClassName={rowClassName}
          rowCount={this.state.commentDataMap.length}
          rowGetter={({index}) => {return this.props.commentData[this.state.commentDataMap[index]]}}
          onRowDoubleClick={this.editRow}
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
      <div id='Comments'>
        <select name='Ballot' value={this.props.ballotId} onChange={this.handleBallotChange}>
          {this.state.ballots.map(i => {
            return (<option key={i.BallotID} value={i.BallotID}>{i.Description}</option>)
          })}
        </select>
        
        {!this.state.showEditModal?
          renderTable()
          :
          <CommentDetail
            commentData={this.props.commentData}
            commentDataMap={this.state.commentDataMap}
            commentIndex={this.state.editIndex}
            users={this.users}
            save={this.saveChanges}
            close={() => {this.setState({showEditModal: false})}}
          />
        }

        <Modal className='ModalContent' overlayClassName='ModalOverlay' isOpen={this.state.showOkModal} appElement={document.querySelector('#Comments')}>
          <p>{this.state.modalMessage}</p>
          <button onClick={this.hideOkModal}>OK</button>
        </Modal>

      </div>
      )
  }

}

function mapStateToProps(state) {
  return {
    isFetchingComments: state.comments.isFetching,
    ballotId: state.comments.ballotId,
    commentData: state.comments.data,
    updateError: state.comments.updateError || state.comments.fetchError,
    errMsg: state.comments.errMsg,
    userData: state.users.data,
    isFetchingUsers: state.users.isFetching
  }
}
export default connect(mapStateToProps)(Comments);