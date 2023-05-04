import { combineReducers, configureStore as configureReduxStore } from '@reduxjs/toolkit';
import type { ThunkAction, AnyAction, Middleware } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { get, set, del } from 'idb-keyval';

import {errorsSlice} from 'dot11-components';
import userSlice from './user';
import currentSlice from './current';
import membersSlice, {loadMembers} from './members';
import sessionsSlice from './sessions';
import meetingsSlice from './meetingsSlice';
import calendarAccountsSlice, {loadCalendarAccounts} from './calendarAccounts';
import webexAccountsSlice, {loadWebexAccounts} from './webexAccounts';
import officersSlice, {loadOfficers} from './officers';
import timeZonesSlice, {loadTimeZones} from './timeZones';
import groupsSlice, {loadGroups} from './groups';
import imatCommitteesSlice from './imatCommittees';
import imatMeetingsSlice from './imatMeetings';
import imatBreakoutsSlice from './imatBreakouts';
import imatMeetingAttendanceSlice from './imatMeetingAttendance';
import imatBreakoutAttendanceSlice from './imatBreakoutAttendance';
import webexMeetingsSlice from './webexMeetingsSlice';
import ieee802WorldSlice from './ieee802World';

const dataAppSliceNames = [
	membersSlice.name,
	groupsSlice.name,
	officersSlice.name,
	sessionsSlice.name,
	meetingsSlice.name,
	webexMeetingsSlice.name,
	imatCommitteesSlice.name,
	imatMeetingsSlice.name,
	imatBreakoutsSlice.name,
	imatBreakoutAttendanceSlice.name,
	imatMeetingAttendanceSlice.name,
	ieee802WorldSlice.name
];

/*
 * For the dataApp slices (anything that maintains a 'loading' state)
 * clear the loading state when restoring from cache.
 */
const transformState = createTransform(
	(state: any) => {
		const {loading, ...rest} = state;
		return rest;
	},
	(state) => {
		return {...state, loading: false};
	},
	{whitelist: dataAppSliceNames}
);


export function configureStore() {

	const reducer = combineReducers({
		[errorsSlice.name]: errorsSlice.reducer,
		[userSlice.name]: userSlice.reducer,
		[currentSlice.name]: currentSlice.reducer,
		[membersSlice.name]: membersSlice.reducer,
		[webexAccountsSlice.name]: webexAccountsSlice.reducer,
		[calendarAccountsSlice.name]: calendarAccountsSlice.reducer,
		[timeZonesSlice.name]: timeZonesSlice.reducer,
		[groupsSlice.name]: groupsSlice.reducer,
		[officersSlice.name]: officersSlice.reducer,
		[sessionsSlice.name]: sessionsSlice.reducer,
		[meetingsSlice.name]: meetingsSlice.reducer,
		[webexMeetingsSlice.name]: webexMeetingsSlice.reducer,
		[imatCommitteesSlice.name]: imatCommitteesSlice.reducer,
		[imatMeetingsSlice.name]: imatMeetingsSlice.reducer,
		[imatBreakoutsSlice.name]: imatBreakoutsSlice.reducer,
		[imatBreakoutAttendanceSlice.name]: imatBreakoutAttendanceSlice.reducer,
		[imatMeetingAttendanceSlice.name]: imatMeetingAttendanceSlice.reducer,
		[ieee802WorldSlice.name]: ieee802WorldSlice.reducer,
	});

	const middleware: Middleware[] = []; //[thunk];
	if (process.env.NODE_ENV !== 'production')
		middleware.push(createLogger({collapsed: true}));

	const persistConfig = {
		key: 'telecons',
		version: 4,
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
			sessionsSlice.name,
			meetingsSlice.name,
			webexMeetingsSlice.name,
			imatMeetingsSlice.name,
			imatBreakoutsSlice.name,
			ieee802WorldSlice.name
		],
		transforms: [transformState],
		stateReconciler: autoMergeLevel2,
		migrate: (state: any) => {
			if (state && state._persist && state._persist.version !== 4)
				return Promise.reject('Discard old version')
			return Promise.resolve(state);
		}
	};

	const store = configureReduxStore({
		reducer: persistReducer(persistConfig, reducer as any),
		middleware: (getDefaultMiddleware) => getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false,
		}).concat(middleware)
	});

	const persistor = persistStore(store, null, () => {
		// After hydrate, load the latest
		store.dispatch(loadWebexAccounts());
		store.dispatch(loadCalendarAccounts());
		store.dispatch(loadTimeZones());
		store.dispatch(loadGroups());
		store.dispatch(loadOfficers());
		store.dispatch(loadMembers());
	});

	return {store, persistor, reducer};
}

// Infer the `RootState` and `AppDispatch` types from the store itself
type StoreType = ReturnType<typeof configureStore>['store'];
export type RootState = ReturnType<ReturnType<typeof configureStore>['reducer']>;
export type AppDispatch = StoreType['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<Promise<ReturnType>, RootState, unknown, AnyAction>
