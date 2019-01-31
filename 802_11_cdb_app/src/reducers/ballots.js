
const defaultState = {
  ballotDataValid: false,
  ballotData: [],
  projectData: [],
  epollData: [],
  getBallots: false,
  getBallotsError: false,
  getBallotsMsg: false,
  addBallot: false,
  addBallotError: false,
  addBallotMsg: '',
  updateBallot: false,
  updateBallotError: false,
  updateBallotMsg: '',
  deleteBallots: false,
  deleteBallotsError: false,
  deleteBallotsMsg: '',
  getEpolls: false,
  getEpollsError: false,
  getEpollsMsg: ''
};

function getProjectsList(ballotData) {
  var projects = [];

  ballotData.forEach(b => {
    if (!projects.includes(b.Project)) {
      projects.push(b);
    }
  })
  return projects;
}

const comments = (state = defaultState, action) => {
  var ballotData, epollData;

  //console.log(action);

  switch (action.type) {
    case 'GET_BALLOTS':
      return Object.assign({}, state, {
        getBallots: true,
        getBallotsError: false,
        ballotData: []
      });
    case 'GET_BALLOTS_SUCCESS':
      return Object.assign({}, state, {
        ballotDataValid: true,
        getBallots: false,
        getBallotsError: false,
        ballotData: action.ballots,
        projectData: getProjectsList(action.ballots)
      });
    case 'GET_BALLOTS_FAILURE':
      return Object.assign({}, state, {
        getBallots: false,
        getBallotsError: true,
        getBallotsMsg: action.errMsg
      });
    case 'CLEAR_GET_BALLOTS_ERROR':
      return Object.assign({}, state, {
        getBallotsError: false,
        getBallotsMsg: ''
      });

    case 'ADD_BALLOT':
      return Object.assign({}, state, {
        addBallot: true,
        addBallotError: false
      });
    case 'ADD_BALLOT_SUCCESS':
      epollData = state.epollData.map(d => 
        d.EpollNum === action.ballot.EpollNum? Object.assign({}, d, {InDatabase: true}): d
        );
      ballotData = state.ballotData.slice();
      ballotData.push(action.ballot);
      return Object.assign({}, state, {
        addBallot: false,
        addBallotError: false,
        ballotData: ballotData,
        projectData: getProjectsList(ballotData),
        epollData: epollData
      });
    case 'ADD_BALLOT_FAILURE':
      return Object.assign({}, state, {
        addBallot: false,
        addBallotError: true,
        addBallotMsg: action.errMsg
      });
    case 'CLEAR_ADD_BALLOT_ERROR':
      return Object.assign({}, state, {
        addBallotError: false
      });

    case 'UPDATE_BALLOT':
      ballotData = state.ballotData.map(d =>
        (d.BallotID === action.ballot.BallotID)? Object.assign({}, d, action.ballot): d
      );
      return Object.assign({}, state, {
        updateBallot: true,
        ballotData: ballotData,
        projectData: getProjectsList(ballotData)
      });
    case 'UPDATE_BALLOT_SUCCESS':
      return Object.assign({}, state, {
        updateBallot: false,
        updateBallotError: false
      });
    case 'UPDATE_BALLOT_FAILURE':
      return Object.assign({}, state, {
        updateBallotError: true,
        updateBallotMsg: action.errMsg
      });

    case 'DELETE_BALLOTS':
      return Object.assign({}, state, {
        deleteBallots: true,
        deleteBallotsError: false,
      });
    case 'DELETE_BALLOTS_SUCCESS':
      // get a list of correspoinding EpollNums
      const epollList = [];
      state.ballotData.forEach(b => {
        if (action.ballotIds.includes(b.BallotID)) {
          epollList.push(b.EpollNum)
        }
      });
      epollData = state.epollData.map(d => 
        epollList.includes(d.EpollNum)? Object.assign({}, d, {InDatabase: false}): d
      );
      ballotData = state.ballotData.filter(b => !action.ballotIds.includes(b.BallotID));
      return Object.assign({}, state, {
        deleteBallots: false,
        ballotData: ballotData,
        projectData: getProjectsList(ballotData),
        epollData: epollData
      });
    case 'DELETE_BALLOTS_FAILTURE':
      return Object.assign({}, state, {
        deleteBallots: false,
        deleteBallotsError: true,
        deleteBallotsMsg: action.errMsg
      });
    case 'CLEAR_DELETE_BALLOTS_ERROR':
      return Object.assign({}, state, {
        deleteBallotsError: false
      });

    case 'GET_EPOLLS':
      return Object.assign({}, state, {
        getEpolls: true,
        getEpollsError: false,
        epollData: []
      });
    case 'GET_EPOLLS_SUCCESS':
      return Object.assign({}, state, {
        getEpolls: false,
        getEpollsError: false,
        epollData: action.epollData
      });
    case 'GET_EPOLLS_FAILURE':
      return Object.assign({}, state, {
        getEpolls: false,
        getEpollsError: true,
        getEpollsMsg: action.errMsg
      });
    case 'CLEAR_GET_EPOLLS_ERROR':
      return Object.assign({}, state, {
        getEpollsError: false
      });

    default:
      return state;
  }
}

export default comments;
