import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {sortData, AppTable} from './AppTable'
import {filterData} from './filter'
import Truncate from 'react-truncate'

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

export default class Comments extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showOkModal: false,
      modalMessage: '',
      commentData: [],
      commentDataMap: [],
      expandAll: false,
      ballots: [],
      ballotId: ''
    }
    this.sortBy = [];
    this.sortDirection = [];
    this.filters = {};
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

  sortFunc = ({sortBy, sortDirection}) => {
    this.sortBy = sortBy;
    this.sortDirection = sortDirection;
    const commentData = this.state.commentData;
    this.setState({
      commentDataMap: sortData(this.state.commentDataMap, commentData, sortBy, sortDirection)
    });
  }
  filtFunc = ({filters}) => {
    this.filters = filters;
    const commentData = this.state.commentData;
    this.setState({
      commentDataMap: sortData(filterData(commentData, filters), commentData, this.sortBy, this.sortDirection)
    });
  }
  updateCommentData = (commentData) => {
    this.setState({
      commentData: commentData,
      commentDataMap: sortData(filterData(commentData, this.filters), commentData, this.sortBy, this.sortDirection)
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
    this.setState({ballotId: ballotId});
    this.getComments(ballotId);
  }
  getComments = (ballotId) => {
    axios.get('/comments', {params: {BallotID: ballotId}})
      .then((response) => {
          if (response.data.status !== 'OK') {
            this.showOkModal(response.data.message);
          }
          else {
            const newcommentData = response.data.data;
            console.log(newcommentData);
            var commentData = [];
            newcommentData.forEach(i => {
              commentData.push({isChecked: false, ...i})
            })
            this.updateCommentData(commentData);
          }
        })
      .catch((error) => {
          this.showOkModal(`Unable to get comments: ${error}`);
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
            var commentData = this.state.commentData.slice();
            commentData.push({isChecked: false, ...i});
            this.updatecommentData(commentData);
          }
      })
      .catch((error) => {
          this.showOkModal('Unable to add user');
      });
    e.preventDefault();
  }

  handleRemoveSelected = () => {
    const {commentDataMap, commentData} = this.state;
    var delUserIds = [];
    for (var i = 0; i < commentDataMap.length; i++) { // only select checked items that are visible
      if (commentData[commentDataMap[i]].isChecked) {
        delUserIds.push(commentData[commentDataMap[i]].UserID)
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

  rowSelect = ({event, index, rowData}) => {
    this.appTableRef.clearCachedRowHeight(index)
    if (this.state.selectedRow === index) {
      // deselect row
      this.setState({selectedRow: -1})
    }
    else {
      if (this.state.selectedRow >= 0) {
        // deselect previous selection
        this.appTableRef.clearCachedRowHeight(this.state.selectedRow)
      }
      // select row
      this.setState({selectedRow: index})
    }
  }

  renderHeaderCheckbox = ({dataKey}) => {
    const {commentDataMap, commentData} = this.state;
    var checked = commentDataMap.length > 0; // not checked if list is empty
    for (var i in commentDataMap) {
      if (!commentData[i].isChecked) {
        checked = false;
      }
    }
    return (
      <div>
      <input type="checkbox"
        checked={checked}
        onChange={e => {
          const checked = e.target.checked;
          const commentDataMap = this.state.commentDataMap;
          var commentData = this.state.commentData.slice();
          for (var i in commentDataMap) {
            commentData[i].isChecked = checked;
          }
          this.setState({commentData})
        }}
      />
      <ExpandIcon 
        showPlus={!this.state.allExpanded}
        onClick={e => {
          console.log('Expand All!')
          var allExpanded = !this.state.allExpanded;
          var commentData = this.state.commentData.slice();
          for (var i in this.state.commentDataMap) {
            commentData[i].isExpanded = allExpanded;
          }
          this.setState({commentData, allExpanded})
          this.appTableRef.clearAllCachedRowHeight()
        }}
      />
      </div>
    );
  }

  renderEditable = (cellInfo) => {
    const commentDataIndex = this.state.commentDataMap[cellInfo.index];
    return (
      <div
        contentEditable
        onBlur={e => {
          this.setState({
            commentData: update(this.state.commentData, {[commentDataIndex]: {[cellInfo.column.id]: {$set: e.target.innerHTML}}})
          });
        }}
        dangerouslySetInnerHTML={{__html: this.state.commentData[commentDataIndex][cellInfo.column.id]}}
      />
    );
  }

  renderCheckbox = (cellInfo) => {
    const commentDataIndex = this.state.commentDataMap[cellInfo.index];
    return (
      <div>
        <input type="checkbox"
          checked={this.state.commentData[commentDataIndex][cellInfo.column.id]}
          onChange={e => {
            this.setState({
              commentData: update(this.state.commentData, {[commentDataIndex]: {[cellInfo.column.id]: {$set: e.target.checked}}})
            })
          }}
        />      
        <ExpandIcon 
          showPlus={!this.state.commentData[commentDataIndex].isExpanded}
          onClick={e => {
            console.log('Clicked on row!')
            const expanded = this.state.commentData[commentDataIndex].isExpanded;
            this.setState({
              commentData: update(this.state.commentData, {[commentDataIndex]: {isExpanded: {$set: !expanded}}})
            })
            this.appTableRef.clearCachedRowHeight(cellInfo.index)
          }}
        />
      </div>
    );
  }

  renderMultiline = (cellInfo) => {
    const commentDataIndex = this.state.commentDataMap[cellInfo.index];
    const expanded = this.state.commentData[commentDataIndex].isExpanded;

    return(
      <Truncate lines={expanded? false: 2}>
        {html_preserve_newline(this.state.commentData[commentDataIndex][cellInfo.column.id])}
      </Truncate>
    )
  }

  componentDidMount() {
    this.getBallots();
  }

  render() {
    const columns = [
      {Header: '', width: 60, dataKey: 'isChecked', sortable: false, filterable: false, HeaderCell: this.renderHeaderCheckbox, Cell: this.renderCheckbox},
      {Header: 'CID', width: 60, dataKey: 'CommentID', filterable: false},
      {Header: 'Commenter', width: 150, dataKey: 'Commenter', filterable: true},
      {Header: 'Must Satisfy', width: 60, dataKey: 'MustSatisfy', filterable: true},
      {Header: 'Category', width: 60, dataKey: 'Category', filterable: true},
      {Header: 'Clause', width: 100, dataKey: 'Clause', filterable: true},
      {Header: 'Page', width: 100, dataKey: 'Page', filterable: true},
      {Header: 'Comment', width: 400, dataKey: 'Comment', filterable: true, Cell: this.renderMultiline},
      {Header: 'Proposed Change', width: 400, dataKey: 'ProposedChange', filterable: true, Cell: this.renderMultiline},
    ];
    return (
      <div id='Comments'>
        <select name='Ballot' value={this.state.ballotId} onChange={this.handleBallotChange}>
          {this.state.ballots.map(i => {
            return (<option key={i.BallotID} value={i.BallotID}>{i.Description}</option>)
          })}
        </select>
        <button onClick={this.assignComments}>Assign</button>
        <button onClick={this.showEditModal}>Edit</button>
        
        <AppTable
          style={{position: 'absolute', top: '32px', bottom: '18px', left: 0, right: 0}}
          rowCount={this.state.commentDataMap.length}
          columns={columns}
          sortFunc={this.sortFunc}
          filtFunc={this.filtFunc}
          rowGetter={({index}) => {return this.state.commentData[this.state.commentDataMap[index]]}}
          ref={(ref) => {this.appTableRef = ref}}
        />

        <Modal className='ModalContent' overlayClassName='ModalOverlay' isOpen={this.state.showOkModal} appElement={document.querySelector('#Comments')}>
          <p>{this.state.modalMessage}</p>
          <button onClick={this.hideOkModal}>OK</button>
        </Modal>

      </div>
      )
  }
}