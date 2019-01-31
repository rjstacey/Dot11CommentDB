
const defaultState = {
  Username: '',
  Name: '',
  SAPIN: '',
  Access: 0,
  LoggedIn: false,
  InProgress: false,
  StatusMsg: ''
}

const comments = (state = defaultState, action) => {

  //console.log(action)
  switch (action.type) {
    case 'LOGIN_GET_STATE':
      return Object.assign({}, state, {
        InProgress: true,
      })
    case 'LOGIN_GET_STATE_SUCCESS':
      if (action.info) {
        return Object.assign({}, state, {
          LoggedIn: !!action.info,
          InProgress: false,
          Username: action.info.username,
          Name: action.info.name,
          SAPIN: action.info.sapin,
          Access: action.info.access
        })
      }
      else {
        return Object.assign({}, state, {
          LoggedIn: false,
          InProgress: false,
        })
      }
    case 'LOGIN_GET_STATE_FAILURE':
      return Object.assign({}, state, {
        LoggedIn: false,
        InProgress: false,
        StatusMsg: action.errMsg
      })
    case 'LOGIN_START':
      return Object.assign({}, state, {
        InProgress: true,
        LoggedIn: false,
      })
    case 'LOGIN_SUCCESS':
      return Object.assign({}, state, {
        LoggedIn: true,
        InProgress: false,
        Username: action.info.username,
        Name: action.info.name,
        SAPIN: action.info.sapin,
        Access: action.info.access
      })
    case 'LOGIN_FAILURE':
      return Object.assign({}, state, {
        LoggedIn: false,
        InProgress: false,
        StatusMsg: action.errMsg
      })
    case 'LOGOUT_START':
      return Object.assign({}, state, {
        InProgress: true,
        StatusMsg: '',
      })
    case 'LOGOUT_SUCCESS':
      return Object.assign({}, state, {
        LoggedIn: false,
        InProgress: false,
      })
    case 'LOGOUT_FAILURE':
      return Object.assign({}, state, {
        LoggedIn: false,
        InProgress: false,
        StatusMsg: action.errMsg
      })
    default:
      return state
  }
}

export default comments
