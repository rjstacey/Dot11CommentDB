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

const rootReducer = combineReducers({
	//login,
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
})

const store = configureStore({
	reducer: rootReducer,
	middleware: [thunk, createLogger({collapsed: true})],
	//middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(createLogger({collapsed: true})),
	devTools: true
});

export default store;
