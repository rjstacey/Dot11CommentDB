
const defaultState = {
  userData: [],
  getUsers: false,
  getUsersError: false,
  getUsersMsg: '',
  updateUsers: false,
  updateUsersError: false,
  updateUsersMsg: '',
  addUsers: false,
  addUsersError: false,
  addUsersMsg: '',
  deleteUsers: false,
  deleteUsersError: false,
  deleteUsersMsg: ''
}

const users = (state = defaultState, action) => {
  var newUserData, userIds;

  //console.log(action)

  switch (action.type) {
    case 'GET_USERS':
      return Object.assign({}, state, {
        getUsers: true,
        getUsersError: false,
      })
    case 'GET_USERS_SUCCESS':
      return Object.assign({}, state, {
        getUsers: false,
        getUsersError: false,
        userData: action.users
      })
    case 'GET_USERS_FAILURE':
      return Object.assign({}, state, {
        getUsers: false,
        getUsersError: true,
        getUsersMsg: action.errMsg
      })
    case 'CLEAR_GET_USERS_ERROR':
      return Object.assign({}, state, {
        getUsersError: false,
      })
    case 'UPDATE_USER':
      newUserData = state.userData.map(u =>
        (u.UserID === action.user.UserID)? Object.assign({}, u, action.user): u
      )
      return Object.assign({}, state, {
        updateUser: true,
        updateUserError: false,
        userData: newUserData
      })
    case 'UPDATE_USER_SUCCESS':
      return Object.assign({}, state, {
        updateUser: false,
        updateUserError: false
      });
    case 'UPDATE_USER_FAILURE':
      return Object.assign({}, state, {
        updateUser: false,
        updateUserError: true,
        updateUserMsg: action.errMsg
      })
    case 'CLEAR_UPDATE_USER_ERROR':
      return Object.assign({}, state, {
        updateUserError: true,
      })
    case 'ADD_USER':
      return Object.assign({}, state, {
        addUser: true,
        addUserError: false,
      })
    case 'ADD_USER_SUCCESS':
      newUserData = state.userData.slice()
      newUserData.push(action.user)
      return Object.assign({}, state, {
        addUser: false,
        addUserError: false,
        userData: newUserData
      })
    case 'ADD_USER_FAILURE':
      return Object.assign({}, state, {
        addUser: false,
        addUserError: true,
        addUserMsg: action.errMsg
      })
    case 'CLEAR_ADD_USER_ERROR':
      return Object.assign({}, state, {
        addUserError: true,
      })
    case 'DELETE_USERS':
      userIds = (action.userIds instanceof Array)? action.userIds: [action.userIds];
      newUserData = state.userData.filter(u => !userIds.includes(u.UserID));
      return Object.assign({}, state, {
        deleteUsers: true,
        deleteUsersError: false,
        userData: newUserData
      })
    case 'DELETE_USERS_SUCCESS':
      return Object.assign({}, state, {
        deleteUsers: false,
        deleteUsersError: false
      })
    case 'DELETE_USERS_FAILURE':
      return Object.assign({}, state, {
        deleteUsers: false,
        deleteUsersError: true,
        deteleUsersMsg: action.errMsg
      })
    case 'CLEAR_DELETE_USERS_ERROR':
      return Object.assign({}, state, {
        deleteUsersError: false
      })
    default:
      return state
  }
}

export default users
