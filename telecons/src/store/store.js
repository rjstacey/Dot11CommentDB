import { combineReducers, createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { get, set, del } from 'idb-keyval';
import { composeWithDevTools } from 'redux-devtools-extension';

import errMsg from 'dot11-components/store/error';
import userSlice from './user';
import currentSlice from './current';
import membersSlice, {loadMembers} from './members';
import calendarAccountsSlice, {loadCalendarAccounts} from './calendarAccounts';
import webexAccountsSlice, {loadWebexAccounts} from './webexAccounts';
import officersSlice, {loadOfficers} from './officers';
import teleconsSlice from './teleconsSlice';
import timeZonesSlice, {loadTimeZones} from './timeZones';
import groupsSlice, {loadGroups} from './groups';
import imatCommitteesSlice from './imatCommittees';
import imatMeetingsSlice from './imatMeetings';
import imatBreakoutsSlice from './imatBreakouts';
import webexMeetingsSlice from './webexMeetingsSlice';
import imatBreakoutAttendanceSlice from './imatBreakoutAttendance';
import ieee802WorldScheduleSlice from './ieee802WorldSchedule';

export function configureStore() {

	const reducer = combineReducers({
		errMsg,
		[userSlice.name]: userSlice.reducer,
		[currentSlice.name]: currentSlice.reducer,
		[membersSlice.name]: membersSlice.reducer,
		[officersSlice.name]: officersSlice.reducer,
		[webexAccountsSlice.name]: webexAccountsSlice.reducer,
		[calendarAccountsSlice.name]: calendarAccountsSlice.reducer,
		[timeZonesSlice.name]: timeZonesSlice.reducer,
		[groupsSlice.name]: groupsSlice.reducer,
		[imatCommitteesSlice.name]: imatCommitteesSlice.reducer,
		[teleconsSlice.name]: teleconsSlice.reducer,
		[webexMeetingsSlice.name]: webexMeetingsSlice.reducer,
		[imatMeetingsSlice.name]: imatMeetingsSlice.reducer,
		[imatBreakoutsSlice.name]: imatBreakoutsSlice.reducer,
		[imatBreakoutAttendanceSlice.name]: imatBreakoutAttendanceSlice.reducer,
		[ieee802WorldScheduleSlice.name]: ieee802WorldScheduleSlice.reducer
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
		whitelist: [
			currentSlice.name,
			membersSlice.name,
			webexAccountsSlice.name,
			calendarAccountsSlice.name,
			timeZonesSlice.name,
			groupsSlice.name,
			officersSlice.name,
			teleconsSlice.name,
			webexMeetingsSlice.name,
			imatMeetingsSlice.name,
		],
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
