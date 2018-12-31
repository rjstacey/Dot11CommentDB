
const defaultState = {
  isFetching: false,
  didInvalidate: false,
  fetchError: false,
  updateError: false,
  importState: {
    error: false,
    complete: false,
    commentCount: 0
  },
  importComplete: false,
  errMsg: '',
  ballotId: '',
  data: []
}

const comments = (state = defaultState, action) => {
  var newComments;

  console.log(action)

  switch (action.type) {
    case 'GETALL_COMMENTS':
      return Object.assign({}, state, {
        isFetching: true,
        fetchError: false,
        ballotId: action.ballotId,
        data: []
      })
    case 'GETALL_COMMENTS_SUCCESS':
      return Object.assign({}, state, {
        didInvalidate: false,
        isFetching: false,
        fetchError: false,
        data: action.comments
      })
    case 'GETALL_COMMENTS_FAILURE':
      return Object.assign({}, state, {
        isFetching: false,
        fetchError: true,
        errMsg: action.errMsg
      })
    case 'CLEAR_FETCH_ERROR':
      return Object.assign({}, state, {
        fetchError: false
      })
    case 'CLEAR_UPDATE_ERROR':
      return Object.assign({}, state, {
        updateError: false
      })
    
    case 'UPDATE_COMMENT':
      newComments = state.data.map(c =>
        (c.CommentID === action.comment.CommentID)? Object.assign({}, c, action.comment): c
      )
      return Object.assign({}, state, {data: newComments})
    case 'UPDATE_COMMENT_FAILURE':
      return Object.assign({}, state, {
        updateError: true,
        errMsg: action.errMsg
      })
    case 'DELETE_COMMENTS_WITH_BALLOTID':
      if (state.ballotId === action.ballotId) {
        return Object.assign({}, state, {data: []})
      }
      return state
    case 'DELETE_COMMENTS_WITH_BALLOTID_FAILURE':
      return Object.assign({}, state, {
        deleteError: true,
        errMsg: action.errMsg
      })

    case 'IMPORT_COMMENTS_FAILURE':
      return Object.assign({}, state, {
        importState: {
          error: true,
          complete: true,
          commentCount: undefined,
          errorMsg: action.errMsg
        }
      })
    case 'IMPORT_COMMENTS_SUCCESS':
      return Object.assign({}, state, {
        importState: {
          error: false,
          complete: true,
          commentCount: action.commentCount,
          errorMsg: ''
        }
      })
    case 'IMPORT_COMMENTS':
      return Object.assign({}, state, {
        importState: {
          error: false,
          complete: false,
          commentCount: undefined,
          errorMsg: ''
        }
      })
    case 'CLEAR_IMPORT_ERROR':
      return Object.assign({}, state, {
        importState: {
          error: false
        }
      })
    case 'DELETE_COMMENTS_WITH_BALLOTID_SUCCESS':
    case 'UPDATE_COMMENT_SUCCESS':
    default:
      return state
  }
}

export default comments
