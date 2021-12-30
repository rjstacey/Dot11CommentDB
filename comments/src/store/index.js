import { combineReducers, createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer } from 'redux-persist';
import { get, set, del } from 'idb-keyval';
//import storage from 'redux-persist/lib/storage';

import {version} from '../../package.json';

import createOffline from './offline';

import members, {loadMembers} from './members';
import ballots, {loadBallots} from './ballots';
import epolls from './epolls';
import comments from './comments';
import commentsHistory from './commentsHistory';
import results from './results';
import voters from './voters';
import votingPools, {loadVotingPools} from './votingPools';
import errMsg from 'dot11-components/store/error';

function configureStore() {

	const reducer = combineReducers({
		members,
		ballots,
		epolls,
		comments,
		commentsHistory,
		results,
		voters,
		votingPools,
		errMsg,
	});

	const {middleware: offlineMiddleware, enhanceReducer: offlineReducer, enhanceStore: offlineEnhancer} = createOffline();

	const composeEnhancer = () => {
		const enhancers = [
			applyMiddleware(thunk, offlineMiddleware),
			offlineEnhancer,
		];

		if (process.env.NODE_ENV !== 'production')
			enhancers.push(applyMiddleware(createLogger({collapsed: true})))	// logger after offline so that we can track its activity

		return compose(...enhancers);
	}

	const persistConfig = {
		key: 'root',
		version,
		storage: {	// IndexedDB for storage using idb-keyval
			setItem: set,
			getItem: get,
			removeItem: del
		},
		blacklist: ['errMsg', 'commentsHistory', 'epolls']
	};

	const store = createStore(
		persistReducer(persistConfig, offlineReducer(reducer)),
		undefined,
		composeEnhancer()
	);

	const persistor = persistStore(store, null, () => {
		// After hydryte, load the latest
		store.dispatch(loadMembers());
		store.dispatch(loadBallots());
		store.dispatch(loadVotingPools());
	});

	return {store, persistor}
}

export default configureStore;
