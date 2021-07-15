import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import errMsg from 'dot11-components/store/error'

import comments from './comments'
import commentsHistory from './commentsHistory'
import users from './users'
import ballots from './ballots'
import results from './results'

const rootReducer = combineReducers({
	comments,
	commentsHistory,
	users,
	ballots,
	results,
	errMsg
})

const store = configureStore({
	reducer: rootReducer,
	middleware: [thunk, createLogger({collapsed: true})],
	devTools: true
});

export default store;
