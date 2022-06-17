import { combineReducers, createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { get, set, del } from 'idb-keyval';
import { composeWithDevTools } from 'redux-devtools-extension';

import errMsg from 'dot11-components/store/error';
import telecons from './telecons';
import webexAccounts, {loadWebexAccounts} from './webexAccounts';
import calendarAccounts, {loadCalendarAccounts} from './calendarAccounts';
import timeZones, {loadTimeZones} from './timeZones';
import groups, {loadGroups} from './groups';
import officers, {loadOfficers} from './officers';
import members, {loadMembers} from './members';
import imatCommittees from './imatCommittees';
import imatMeetings from './imatMeetings';
import imatBreakouts from './imatBreakouts';
import imatBreakoutAttendance from './imatBreakoutAttendance';

function configureStore() {

	const reducer = combineReducers({
		errMsg,
		telecons,
		webexAccounts,
		calendarAccounts,
		timeZones,
		groups,
		officers,
		members,
		imatCommittees,
		imatMeetings,
		imatBreakouts,
		imatBreakoutAttendance,
	});

	const middleware = [thunk];
	if (process.env.NODE_ENV !== 'production')
		middleware.push(createLogger({collapsed: true}));

	const persistConfig = {
		key: 'telecons',
		version: 2,
		storage: {	// IndexedDB for storage using idb-keyval
			setItem: set,
			getItem: get,
			removeItem: del
		},
		whitelist: ['telecons', 'webexAccounts', 'calendarAccounts', 'timeZones', 'groups', 'officers', 'members', 'imatMeetings'],
		stateReconciler: autoMergeLevel2,
		migrate: (state) => {
			if (state && state._persist && state._persist.version !== 2)
				return Promise.reject('Discard old version')
			return Promise.resolve(state);
		}
	};

	const store = createStore(
		persistReducer(persistConfig, reducer),
		composeWithDevTools(applyMiddleware(...middleware))
	);

	const persistor = persistStore(store, null, () => {
		// After hydrate, load the latest
		store.dispatch(loadWebexAccounts());
		store.dispatch(loadCalendarAccounts());
		store.dispatch(loadTimeZones());
		store.dispatch(loadGroups());
		store.dispatch(loadOfficers());
		store.dispatch(loadMembers());
	});

	return {store, persistor};
}

export default configureStore;
