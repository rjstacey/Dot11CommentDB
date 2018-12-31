
const defaultState = {
  isFetching: false,
  didInvalidate: false,
  fetchError: false,
  updateError: false,
  errMsg: '',
  data: []
}

const users = (state = defaultState, action) => {
  var newUsers, userIds;

  console.log(action)

  switch (action.type) {
    case 'GETALL_USERS':
      return Object.assign({}, state, {
        isFetching: true,
        fetchError: false,
      })
    case 'GETALL_USERS_SUCCESS':
      return Object.assign({}, state, {
        didInvalidate: false,
        isFetching: false,
        fetchError: false,
        data: action.users
      })
    case 'GETALL_USERS_FAILURE':
      return Object.assign({}, state, {
        isFetching: false,
        fetchError: true,
        errMsg: action.errMsg
      })
    case 'INVALIDATE_USERS':
      return Object.assign({}, state, {
        didInvalidate: true
      })
    case 'CLEAR_ERROR':
      return Object.assign({}, state, {
        fetchError: false,
        updateError: false
      })
    case 'UPDATE_USER':
      newUsers = state.data.map(u =>
        (u.UserID === action.user.UserID)? Object.assign({}, u, action.user): u
      )
      return Object.assign({}, state, {data: newUsers})
    case 'UPDATE_USER_FAILURE':
    case 'DELETE_USERS_FAILURE':
      return Object.assign({}, state, {
        updateError: true,
        errMsg: action.errMsg
      })
    case 'DELETE_USERS':
      userIds = (action.userIds instanceof Array)? action.userIds: [action.userIds];
      newUsers = state.data.filter(u => !userIds.includes(u.UserID));
      return Object.assign({}, state, {data: newUsers})
    case 'ADD_USER':
      return state;
    case 'ADD_USER_SUCCESS':
      newUsers = state.data.slice();
      newUsers.push(action.userData);
      return Object.assign({}, state, {data: newUsers});
    case 'ADD_USER_FAILURE':
      return Object.assign({}, state, {
        updateError: true,
        errMsg: action.errMsg
      })
    case 'UPDATE_USER_SUCCESS':
    case 'DELETE_USERS_SUCCESS':
    default:
      return state
  }
}

export default users
