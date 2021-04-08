import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import errMsg from 'dot11-common/store/error'
import login from 'dot11-common/store/login'

import members from './members'
import sessions from './sessions'
import imatMeetings from './imatMeetings'
import breakouts from './breakouts'
import attendees from './attendees'

const rootReducer = combineReducers({
	login,
	members,
	sessions,
	imatMeetings,
	breakouts,
	attendees,
	errMsg
})

const store = configureStore({
	reducer: rootReducer,
	middleware: [thunk, createLogger({collapsed: true})],
	//middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(createLogger({collapsed: true})),
	devTools: true
});

export default store;
