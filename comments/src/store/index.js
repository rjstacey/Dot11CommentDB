import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import errMsg from 'dot11-components/store/error'

import comments from './comments'
import commentsHistory from './commentsHistory'
import users from './users'
import ballots from './ballots'
import results from './results'

const reducer = combineReducers({
	comments,
	commentsHistory,
	users,
	ballots,
	results,
	errMsg
});

const middleware = [thunk];
if (process.env.NODE_ENV !== 'production')
	middleware.push(createLogger({collapsed: true}));

// enable devTool only with development
const devTools = process.env.NODE_ENV !== 'production';

const store = configureStore({reducer, middleware, devTools});

export default store;
