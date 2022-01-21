import { combineReducers, createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { get, set, del } from 'idb-keyval';
import { composeWithDevTools } from 'redux-devtools-extension';

import {version} from '../../package.json';

import members, {loadMembers} from './members';
import sessions, {loadSessions, loadTimeZones} from './sessions';
import imatMeetings from './imatMeetings';
import breakouts from './breakouts';
import attendees from './attendees';
import ballots from './ballots';
import errMsg from 'dot11-components/store/error';

function configureStore() {

	const reducer = combineReducers({
		members,
		sessions,
		imatMeetings,
		breakouts,
		attendees,
		ballots,
		errMsg
	});

	const middleware = [thunk];
	if (process.env.NODE_ENV !== 'production')
		middleware.push(createLogger({collapsed: true}));

	// enable devTool only with development
	const devTools = process.env.NODE_ENV !== 'production';

	const persistConfig = {
		key: 'membership',
		version: 1,
		storage: {	// IndexedDB for storage using idb-keyval
			setItem: set,
			getItem: get,
			removeItem: del
		},
		whitelist: ['members', 'sessions'],
		stateReconciler: autoMergeLevel2,
		migrate: (state) => {
			if (state && state._persist && state._persist.version !== 1)
				return Promise.reject('Discard old version')
			return Promise.resolve(state);
		}
	};

	const store = createStore(
		persistReducer(persistConfig, reducer),
		composeWithDevTools(applyMiddleware(...middleware))
	);

	const persistor = persistStore(store, null, () => {
		store.dispatch(loadTimeZones());
		store.dispatch(loadSessions());
		store.dispatch(loadMembers());
	});

	return {store, persistor};
}

export default configureStore;
