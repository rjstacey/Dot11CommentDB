import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import errMsg from 'dot11-common/store/error'
import login from 'dot11-common/store/login'

import users from './users'
import ballots from './ballots'
import epolls from './epolls'
import comments from './comments'
import commentsHistory from './commentsHistory'
import results from './results'
import votingPools from './votingPools'
import voters from './voters'

const rootReducer = combineReducers({
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

const store = configureStore({
	reducer: rootReducer,
	middleware: [thunk, createLogger({collapsed: true})],
	//middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(createLogger({collapsed: true})),
	devTools: true
});

export default store;
