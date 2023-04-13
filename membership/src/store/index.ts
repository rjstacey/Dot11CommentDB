import { combineReducers, configureStore } from '@reduxjs/toolkit';
import type { ThunkAction, AnyAction, Middleware } from '@reduxjs/toolkit';

import { createLogger } from 'redux-logger';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { get, set, del } from 'idb-keyval';

import userSlice from './user';
import timeZonesSlice, {loadTimeZones} from './timeZones';
import permissionsSlice, {loadPermissions} from './permissions';
import membersSlice, {loadMembers} from './members';
//import sessionsSlice, {loadSessions} from './sessions';
//import imatMeetingsSlice from './imatMeetings';
//import breakoutsSlice from './breakouts';
//import attendeesSlice from './attendees';
import attendancesSlice from './attendances';
import ballotParticipationSlice from './ballotParticipation';

import {errorsSlice} from 'dot11-components';

const transformState = createTransform(
	(state: any) => {
		const {loading, ...rest} = state;
		return rest;
	},
	(state) => ({...state, loading: false}),
	{whitelist: ['members']}
);

function configureStore2() {

	const reducer = combineReducers({
		[userSlice.name]: userSlice.reducer,
		[membersSlice.name]: membersSlice.reducer,
		//[sessionsSlice.name]: sessionsSlice.reducer,
		//[imatMeetingsSlice.name]: imatMeetingsSlice.reducer,
		//[breakoutsSlice.name]: breakoutsSlice.reducer,
		//[attendeesSlice.name]: attendeesSlice.reducer,
		[attendancesSlice.name]: attendancesSlice.reducer,
		[ballotParticipationSlice.name]: ballotParticipationSlice.reducer,
		[timeZonesSlice.name]: timeZonesSlice.reducer,
		[permissionsSlice.name]: permissionsSlice.reducer,
		[errorsSlice.name]: errorsSlice.reducer
	});

	const persistConfig = {
		key: 'membership',
		version: 2,
		storage: {	// IndexedDB for storage using idb-keyval
			setItem: set,
			getItem: get,
			removeItem: del
		},
		whitelist: [
			membersSlice.name,
		],
		stateReconciler: autoMergeLevel2,
		transforms: [transformState],
		migrate: (state: any) => {
			if (state && state._persist && state._persist.version !== 2)
				return Promise.reject('Discard old version')
			return Promise.resolve(state);
		}
	};

	const middleware: Middleware[] = []; //[thunk];
	if (process.env.NODE_ENV !== 'production')
		middleware.push(createLogger({collapsed: true}));

	const store = configureStore({
		reducer: persistReducer(persistConfig, reducer as any),
		middleware: (getDefaultMiddleware) => getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false,
		}).concat(middleware)
	});

	const persistor = persistStore(store, null, () => {
		store.dispatch(loadTimeZones());
		store.dispatch(loadPermissions());
		store.dispatch(loadMembers());
	});

	return {store, persistor, reducer};
}

// Infer the `RootState` and `AppDispatch` types from the store itself
type StoreType = ReturnType<typeof configureStore2>['store'];
//export type RootState = ReturnType<StoreType['getState']>;
export type RootState = ReturnType<ReturnType<typeof configureStore2>['reducer']>;
export type AppDispatch = StoreType['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<Promise<ReturnType>, RootState, unknown, AnyAction>

export default configureStore2;
