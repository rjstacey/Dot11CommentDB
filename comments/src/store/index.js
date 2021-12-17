import { configureStore, combineReducers } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer } from 'redux-persist';
import { get, set, del } from 'idb-keyval';
//import storage from 'redux-persist/lib/storage';

import members, {loadMembers} from './members';
import ballots, {loadBallots} from './ballots';
import comments from './comments';
import commentsHistory from './commentsHistory';
import results from './results';
import voters from './voters';
import votingPools, {loadVotingPools} from './votingPools';
import errMsg from 'dot11-components/store/error';

const reducer = combineReducers({
	members,
	ballots,
	comments,
	commentsHistory,
	results,
	voters,
	votingPools,
	errMsg
});

const middleware = [thunk];
if (process.env.NODE_ENV !== 'production')
	middleware.push(createLogger({collapsed: true}));

const storage = {
	setItem: set,
	//setItem: (key, value) => {console.log(key, value); return set(key, value)},
	getItem: get,
	//getItem: (key) => {console.log(key); return get(key)},
	removeItem: del
};

const persistConfig = {
	key: 'root',
	version: 1,
	storage,
	blacklist: ['errMsg', 'commentsHistory', 'epolls']
};

const store = configureStore({
	reducer: persistReducer(persistConfig, reducer),
	//reducer,
	//middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(middleware),
	middleware
});

const persistor = persistStore(store, null, () => {
	store.dispatch(loadMembers());
	store.dispatch(loadBallots());
	store.dispatch(loadVotingPools());
});

export {store, persistor} 
