import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import errMsg from 'dot11-components/store/error'
import telecons from './telecons'

const reducer = combineReducers({
	errMsg,
	telecons
});

const middleware = [thunk];
if (process.env.NODE_ENV !== 'production')
	middleware.push(createLogger({collapsed: true}));

// enable devTool only with development
const devTools = process.env.NODE_ENV !== 'production';

const store = configureStore({reducer, middleware, devTools});

export default store;
