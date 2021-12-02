import { configureStore, combineReducers } from '@reduxjs/toolkit'
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web

import {version} from '../../package.json';

import users from './users';
import ballots from './ballots';
import comments from './comments';
import commentsHistory from './commentsHistory';
import results from './results';
import errMsg from 'dot11-components/store/error';

const reducer = combineReducers({
	users,
	ballots,
	comments,
	commentsHistory,
	results,
	errMsg
});

const middleware = [thunk];
if (process.env.NODE_ENV !== 'production')
	middleware.push(createLogger({collapsed: true}));

const persistConfig = {
	key: 'root',
	version: 1,
	storage,
	blacklist: ['errMsg', 'commentsHistory']
};

const store = configureStore({
	reducer: persistReducer(persistConfig, reducer),
	//middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(middleware),
	middleware
});

const persistor = persistStore(store);

export {store, persistor} 
