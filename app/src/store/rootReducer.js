import { combineReducers } from '@reduxjs/toolkit'
import login from './login'
import users from './users'
import ballots from './ballots'
import epolls from './epolls'
import comments from './comments'
import commentsHistory from './commentsHistory'
import results from './results'
import votingPools from './votingPools'
import voters from './voters'
import errMsg from './error'

export default combineReducers({
	login,
	users,
	ballots,
	epolls,
	comments,
	commentsHistory,
	results,
	votingPools,
	voters,
	errMsg
})
