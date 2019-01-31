
const defaultState = {
  ballotId: 0,
  resultsDataValid: false,
  resultsData: [],
  resultsSummary: {},
  importResults: false,
  importResultsError: false,
  importResultsMsg: '',
}

const results = (state = defaultState, action) => {

  //console.log(action)

  switch (action.type) {
    case 'GET_RESULTS':
      return Object.assign({}, state, {
        getResults: true,
        getResultsError: false,
        resultsData: []
      })
    case 'GET_RESULTS_SUCCESS':
      return Object.assign({}, state, {
        ballotDataValid: true,
        getResults: false,
        getResultsError: false,
        resultsData: action.results,
        resultsSummary: action.summary
      })
    case 'GET_RESULTS_FAILURE':
      return Object.assign({}, state, {
        getResults: false,
        getResultsError: true,
        getResultsMsg: action.errMsg
      })

    case 'DELETE_RESULTS':
      return Object.assign({}, state, {
        deleteResults: true,
        deleteResultsError: false
      }, (state.ballotId === action.ballotId)? {resultsData: []}: null)
    case 'DELETE_RESULTS_SUCCESS':
      return Object.assign({}, state, {
        deleteResults: false,
        deleteResultsError: false
      })
    case 'DELETE_RESULTS_FAILURE':
      return Object.assign({}, state, {
        deleteResults: false,
        deleteResultsError: true,
        deleteResultsMsg: action.errMsg
      })
    case 'CLEAR_DELETE_RESULTS_ERROR':
      return Object.assign({}, state, {
        deleteResultsError: false,
      })

    case 'CLEAR_GET_RESULTS_ERROR':
      return Object.assign({}, state, {
        getResultsError: false,
        getResultsMsg: ''
      })
    case 'IMPORT_RESULTS':
      return Object.assign({}, state, {
        importResults: true,
        importResultsError: false,
        importResultsMsg: ''
      })
    case 'IMPORT_RESULTS_SUCCESS':
      return Object.assign({}, state, {
        importResults: false,
        importResultsError: false,
        importSummary: action.summary
      })
    case 'IMPORT_RESULTS_FAILURE':
      return Object.assign({}, state, {
        importResults: false,
        importResultsError: true,
        importResultsMsg: action.errMsg
      })
    case 'CLEAR_IMPORT_RESULTS_ERROR':
      return Object.assign({}, state, {
        importResultsError: false,
        importResultsMsg: ''
      })
    case 'SUMMARIZE_RESULTS':
      return Object.assign({}, state, {
        summarizeResults: true,
        summarizeResultsError: false,
        summarizeResultsMsg: ''
      })
    case 'SUMMARIZE_RESULTS_SUCCESS':
      return Object.assign({}, state, {
        summarizeResults: false,
        summarizeResultsError: false,
        resultsSummary: action.summary
      })
    case 'SUMMARIZE_RESULTS_FAILURE':
      return Object.assign({}, state, {
        summarizeResults: false,
        summarizeResultsError: true,
        summarizeResultsMsg: action.errMsg
      })
    case 'CLEAR_SUMMARIZE_RESULTS_ERROR':
      return Object.assign({}, state, {
        summarizeResultsError: false,
        summarizeResultsMsg: ''
      })

    default:
      return state
  }
}

export default results
