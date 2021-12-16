import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';
import { persistStore, persistReducer } from 'redux-persist';
import { get, set, del } from 'idb-keyval';

import errMsg from 'dot11-components/store/error';

import members from './members';
import sessions from './sessions';
import ballots from './ballots';
import epolls from './epolls';
import imatMeetings from './imatMeetings';
import breakouts from './breakouts';
import attendees from './attendees';
import voters from './voters';
import votingPools from './votingPools';

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

const storage = {
	setItem: set, //(key, value) => {console.log(key, value); set(key, value)},
	getItem: get,
	removeItem: del
};

const persistConfig = {
	key: 'root',
	version: 1,
	storage,
	blacklist: ['errMsg', 'attendees', 'breakouts', 'sessions', 'voters', 'votingPools']
};

const store = configureStore({
	reducer: persistReducer(persistConfig, reducer),
	//reducer,
	middleware,
	devTools
});

const persistor = persistStore(store);

export default store;
