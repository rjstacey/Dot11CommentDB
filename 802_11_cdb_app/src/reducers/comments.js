
import {sortData, filterData} from '../filter';

const defaultState = {
  project: '',
  ballotId: '',
  filters: {},
  sortBy: [],
  sortDirection: {},
  commentData: [],
  commentDataMap: [],
  getComments: false,
  getCommentsError: false,
  getCommentsMsg: '',
  updateComment: false,
  updateCommentError: false,
  updateCommentMsg: '',
  deleteComments: false,
  deleteCommentsError: false,
  deleteCommentsMsg: '',
  importComments: false,
  importCommentsError: false,
  importCommentsMsg: '',
  importCommentsCount: undefined
}

const comments = (state = defaultState, action) => {
  var newCommentData, newResolutions;

  //console.log(action)

  switch (action.type) {
    case 'SET_PROJECT':
      if (state.project !== action.project) {
        return Object.assign({}, state, {
          project: action.project,
          ballotId: 0,
          commentData: []
        });
      }
      return state;
    case 'SET_COMMENTS_SORT':
      return Object.assign({}, state, {
        sortBy: action.sortBy,
        sortDirection: action.sortDirection,
        commentDataMap: sortData(state.commentDataMap, state.commentData, state.sortBy, state.sortDirection)
      });
    case 'SET_COMMENTS_FILTER':
      const filters = Object.assign({}, state.filters, {[action.dataKey]: action.filter});
      return Object.assign({}, state, {
        filters,
        commentDataMap: sortData(filterData(state.commentData, filters), state.commentData, state.sortBy, state.sortDirection)
      });
    case 'GET_COMMENTS':
      return Object.assign({}, state, {
        getComments: true,
        getCommentsError: false,
        ballotId: action.ballotId,
        commentData: [],
        commentDataMap: []
      })
    case 'GET_COMMENTS_SUCCESS':
      return Object.assign({}, state, {
        getComments: false,
        getCommentsError: false,
        commentData: action.comments,
        commentDataMap: sortData(filterData(action.comments, filters), state.commentData, state.sortBy, state.sortDirection)
      })
    case 'GET_COMMENTS_FAILURE':
      return Object.assign({}, state, {
        getComments: false,
        getCommentsError: true,
        getCommentsMsg: action.errMsg
      })
    case 'CLEAR_GET_COMMENTS_ERROR':
      return Object.assign({}, state, {
        getCommentsError: false
      })

    case 'DELETE_COMMENTS_WITH_BALLOTID':
      return Object.assign({}, state, {
        deleteComments: true,
        deleteCommentsError: false
      }, (state.ballotId === action.ballotId)? {commentData: []}: null)
    case 'DELETE_COMMENTS_WITH_BALLOTID_SUCCESS':
      return Object.assign({}, state, {
        deleteComments: false,
        deleteCommentsError: false
      })
    case 'DELETE_COMMENTS_WITH_BALLOTID_FAILURE':
      return Object.assign({}, state, {
        deleteComment: false,
        deleteCommentError: true,
        deleteCommentMsg: action.errMsg
      })
    case 'CLEAR_DELETE_COMMENTS_WITH_BALLOTID_ERROR':
      return Object.assign({}, state, {
        deleteCommentError: false,
      })

    case 'IMPORT_COMMENTS':
      return Object.assign({}, state, {
        importComments: true,
        importCommentsError: false,
        importCommentsCount: undefined
      })
    case 'IMPORT_COMMENTS_SUCCESS':
      return Object.assign({}, state, {
        importComments: false,
        importCommentsError: false,
        importCommentsCount: action.commentCount
      })
    case 'IMPORT_COMMENTS_FAILURE':
      return Object.assign({}, state, {
        importComments: false,
        importCommentsError: true,
        importCommentsMsg: action.errMsg
      })
    case 'CLEAR_IMPORT_COMMENTS_ERROR':
      return Object.assign({}, state, {
        importCommentsError: false
      })

    case 'UPDATE_COMMENT':
      if (state.ballotID !== action.comment.BallotID) {
        return Object.assign({}, state, {
          updateComment: true,
        })
      }
      newCommentData = state.commentData.map(c =>
        (c.CommentID === action.comment.CommentID)? Object.assign({}, c, action.comment): c
      )
      return Object.assign({}, state, {
        updateComment: true,
        commentData: newCommentData
      })
    case 'UPDATE_COMMENT_SUCCESS':
      return Object.assign({}, state, {
        updateComment: false,
        updateCommentError: false
      })
    case 'UPDATE_COMMENT_FAILURE':
      return Object.assign({}, state, {
        updateCommentError: true,
        updateCommentMsg: action.errMsg
      })
    case 'CLEAR_UPDATE_COMMENT_ERROR':
      return Object.assign({}, state, {
        updateCommentError: false,
      })

    case 'UPDATE_RESOLUTION':
      if (state.ballotID !== action.resolution.BallotID) {
        return Object.assign({}, state, {
          updateComment: true,
        })
      }
      newCommentData = state.commentData.map(c => {
        if (c.CommentID === action.resolution.CommentID) {
          newResolutions = c.resolutions.map(r => 
            (r.ResolutionID === action.resolution.ResolutionID)? Object.assign({}, r, action.resolution): r
          )
          return Object.assign({}, c, {resolutions: newResolutions})
        }
        else {
          return c
        }
      })
      return Object.assign({}, state, {
        updateComment: true,
        commentData: newCommentData
      })
    case 'UPDATE_RESOLUTION_SUCCESS':
      return Object.assign({}, state, {
        updateComment: false,
        updateCommentError: false
      })
    case 'UPDATE_RESOLUTION_FAILURE':
      return Object.assign({}, state, {
        updateCommentError: true,
        updateCommentMsg: action.errMsg
      })
    case 'CLEAR_UPDATE_RESOLUTION_ERROR':
      return Object.assign({}, state, {
        updateCommentError: false,
      })

    case 'ADD_RESOLUTION':
      if (state.ballotID !== action.resolution.BallotID) {
        return Object.assign({}, state, {
          updateComment: true,
        })
      }
      newCommentData = state.commentData.map((c, index) => {
        if (c.CommentID === action.resolution.CommentID) {
          newResolutions = c.resolutions.slice()
          newResolutions.push({ResolutionID: index, ...action.resolution})
          return Object.assign({}, c, {resolutions: newResolutions})
        }
        else {
          return c
        }
      })
      return Object.assign({}, state, {
        updateComment: true,
        commentData: newCommentData
      })
    case 'ADD_RESOLUTION_SUCCESS':
      if (state.ballotID !== action.resolution.BallotID) {
        return Object.assign({}, state, {
          updateComment: false,
          updateCommentError: false,
        })
      }
      newCommentData = state.commentData.map(c => {
        if (c.CommentID === action.resolution.CommentID) {
          newResolutions = c.resolutions.slice()
          newResolutions.push(action.resolution)
          return Object.assign({}, c, {resolutions: newResolutions})
        }
        else {
          return c
        }
      })
      return Object.assign({}, state, {
        updateComment: false,
        updateCommentError: false,
        commentData: newCommentData
      })
    case 'ADD_RESOLUTION_FAILURE':
      return Object.assign({}, state, {
        updateCommentError: true,
        updateCommentMsg: action.errMsg
      })
    case 'CLEAR_ADD_RESOLUTION_ERROR':
      return Object.assign({}, state, {
        updateCommentError: false,
      })
    case 'DELETE_RESOLUTION':
      return Object.assign({}, state, {
        updateComment: true,
        updateCommentError: false
      })
    case 'DELETE_RESOLUTION_SUCCESS':
      newCommentData = state.commentData.map((c, index) => {
        if (c.CommentID === action.resolution.CommentID) {
          newResolutions = c.resolutions.filter(r => 
            (r.ResolutionID !== action.data.ResolutionID)
          )
          return Object.assign({}, c, {resolutions: newResolutions})
        }
        else {
          return c
        }
      })
      return Object.assign({}, state, {
        updateComment: false,
        updateCommentError: false,
        commentData: newCommentData
      })
    case 'DELETE_RESOLUTION_FAILURE':
      return Object.assign({}, state, {
        updateCommentError: true,
        updateCommentMsg: action.errMsg
      })
    case 'CLEAR_DELETE_RESOLUTION_ERROR':
      return Object.assign({}, state, {
        updateCommentError: false
      })
    default:
      return state
  }
}

export default comments
