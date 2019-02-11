import { combineReducers } from 'redux'
import login from './login'
import users from './users'
import ballots from './ballots'
import epolls from './epolls'
import comments from './comments'
import results from './results'
import voters from './voters'

export default combineReducers({
	login,
	users,
	ballots,
	epolls,
	comments,
	results,
	voters
})
