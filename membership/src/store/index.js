import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import errMsg from 'dot11-components/store/error'

import members from './members'
import sessions from './sessions'
import ballots from './ballots'
import epolls from './epolls'
import imatMeetings from './imatMeetings'
import breakouts from './breakouts'
import attendees from './attendees'
import voters from './voters'
import votingPools from './votingPools'

const reducer = combineReducers({
	members,
	sessions,
	ballots,
	epolls,
	imatMeetings,
	breakouts,
	attendees,
	voters,
	votingPools,
	errMsg
});

const middleware = [thunk];
if (process.env.NODE_ENV !== 'production')
	middleware.push(createLogger({collapsed: true}));

// enable devTool only with development
const devTools = process.env.NODE_ENV !== 'production';

const store = configureStore({reducer, middleware, devTools});

export default store;
