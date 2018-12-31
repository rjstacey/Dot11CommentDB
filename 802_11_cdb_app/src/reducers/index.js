import { combineReducers } from 'redux'
import users from './users'
import ballots from './ballots'
import comments from './comments'

export default combineReducers({
  users,
  ballots,
  comments
})
