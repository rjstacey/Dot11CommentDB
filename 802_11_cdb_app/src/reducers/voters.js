
const defaultState = {
  ballotId: 0,
  votersDataValid: false,
  votersData: [],
  importVoters: false,
  importVotersError: false,
  importVotersMsg: '',
}

const voters = (state = defaultState, action) => {

  console.log(action)

  switch (action.type) {
    case 'GET_VOTERS':
      return Object.assign({}, state, {
        getVoters: true,
        getVotersError: false,
        votersData: []
      })
    case 'GET_VOTERS_SUCCESS':
      return Object.assign({}, state, {
        votersDataValid: true,
        getVoters: false,
        getVotersError: false,
        votersData: action.voters,
      })
    case 'GET_VOTERS_FAILURE':
      return Object.assign({}, state, {
        getVoters: false,
        getVotersError: true,
        getVotersMsg: action.errMsg
      })
    case 'CLEAR_GET_VOTERS_ERROR':
      return Object.assign({}, state, {
        getVotersError: false,
        getVotersMsg: ''
      })

    case 'DELETE_VOTERS':
      return Object.assign({}, state, {
        deleteVoters: true,
        deleteVotersError: false
      }, (state.ballotId === action.ballotId)? {votersData: []}: null)
    case 'DELETE_VOTERS_SUCCESS':
      return Object.assign({}, state, {
        deleteVoters: false,
        deleteVotersError: false
      })
    case 'DELETE_VOTERS_FAILURE':
      return Object.assign({}, state, {
        deleteVoters: false,
        deleteVotersError: true,
        deleteVotersMsg: action.errMsg
      })
    case 'CLEAR_DELETE_VOTERS_ERROR':
      return Object.assign({}, state, {
        deleteVotersError: false,
      })

    case 'IMPORT_VOTERS':
      return Object.assign({}, state, {
        importVoters: true,
        importVotersError: false,
        importVotersMsg: ''
      })
    case 'IMPORT_VOTERS_SUCCESS':
      return Object.assign({}, state, {
        importVoters: false,
        importVotersError: false,
        importSummary: action.summary
      })
    case 'IMPORT_VOTERS_FAILURE':
      return Object.assign({}, state, {
        importVoters: false,
        importVotersError: true,
        importVotersMsg: action.errMsg
      })
    case 'CLEAR_IMPORT_VOTERS_ERROR':
      return Object.assign({}, state, {
        importVotersError: false,
        importVotersMsg: ''
      })

    default:
      return state
  }
}

export default voters
