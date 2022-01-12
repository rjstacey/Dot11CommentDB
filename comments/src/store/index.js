import { combineReducers, createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { get, set, del } from 'idb-keyval';
import { composeWithDevTools } from 'redux-devtools-extension';

import {version} from '../../package.json';

import members, {loadMembers} from './members';
import ballots, {loadBallots} from './ballots';
import epolls from './epolls';
import comments, {persistTransforms} from './comments';
import commentsHistory from './commentsHistory';
import results from './results';
import voters from './voters';
import votingPools, {loadVotingPools} from './votingPools';
import errMsg from 'dot11-components/store/error';
import offline, {registerOffline} from './offline';
import liveUpdate, {registerLiveUpdate} from './liveUpdate';

function dataAdapterToStorage(state, key) {
	// don't store 'loading' state, map entities to an array
	let {entities, ids, loading, ...rest} = state;
	entities = ids.map(id => entities[id]);
	return {
		...rest,
		entities
	}
}

function dataAdapterFromStorage(state, key) {
	// don't modify 'loading' state, map entities from array
	const {entities, ids, loading, ...rest} = state;
	let dataAdapterState = {ids, entities};
	if (Array.isArray(entities)) {
		dataAdapterState = entities.reduce((s, e) => {
			const id = e.id;
			s.ids.push(id);
			s.entities[id] = e;
			return s;
		}, {ids: [], entities: {}});
	}
	return {
		...rest,
		...dataAdapterState,
	}
}

const dataAdapterTansform = createTransform(
	dataAdapterToStorage,
	dataAdapterFromStorage,
	{whitelist: ['comments', 'ballots', 'results', 'voters', 'votingPools']}
);

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
		offline,
		liveUpdate
	});

	const middleware = [thunk];
	if (process.env.NODE_ENV !== 'production')
		middleware.push(createLogger({collapsed: true}));

	const persistConfig = {
		key: 'comments',
		version,
		storage: {	// IndexedDB for storage using idb-keyval
			setItem: set,
			getItem: get,
			removeItem: del
		},
		whitelist: ['members', 'ballots', 'comments', 'results', 'voters', 'votingPools'],
		transforms: [dataAdapterTansform],
		stateReconciler: autoMergeLevel2
	};

	const store = createStore(
		persistReducer(persistConfig, reducer),
		composeWithDevTools(applyMiddleware(...middleware))
	);

	const persistor = persistStore(store, null, () => {

		registerOffline(store);
		registerLiveUpdate(store);

		// After hydrate, load the latest
		store.dispatch(loadMembers());
		store.dispatch(loadBallots());
		store.dispatch(loadVotingPools());
	});

	return {store, persistor}
}

export default configureStore;
