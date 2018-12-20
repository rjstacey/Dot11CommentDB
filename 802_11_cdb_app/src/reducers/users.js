
const defaultState = {
  isFetching: false,
  didInvalidate: false,
  users: []
}

const users = (state = defaultState, action) => {
  switch (action.type) {
    case 'FETCH_USERS':
      return Object.assign({}, state, {
        isFetching: true,
        fetchError: false,
      })
    case 'FETCH_USERS_SUCCESS':
      return Object.assign({}, state, {
        isFetching: false,
        fetchError: false,
        users: action.users
      })
    case 'FETCH_USERS_FAILURE':
      return Object.assign({}, state, {
        isFetching: false,
        fetchError: true,
        errMsg: action.errMsg
      })
    case 'UPDATE_USER':
      return state.users.map(u =>
        (u.id === action.id)
          ? action.user
          : u
      )
    default:
      return state
  }
}

export default users
