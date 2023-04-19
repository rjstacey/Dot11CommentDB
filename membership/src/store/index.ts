import { combineReducers, configureStore as configureReduxStore } from '@reduxjs/toolkit';
import type { ThunkAction, AnyAction, Middleware } from '@reduxjs/toolkit';

import { createLogger } from 'redux-logger';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { get, set, del } from 'idb-keyval';

import userSlice from './user';
import timeZonesSlice, {loadTimeZones} from './timeZones';
import permissionsSlice, {loadPermissions} from './permissions';
import membersSlice, {loadMembers} from './members';
import attendancesSlice, {loadAttendances} from './attendances';
import ballotParticipationSlice, {loadBallotParticipation} from './ballotParticipation';

import {errorsSlice} from 'dot11-components';

const transformState = createTransform(
	(state: any) => {
		const {loading, ...rest} = state;
		return rest;
	},
	(state) => ({...state, loading: false}),
	{whitelist: [
		membersSlice.name,
		attendancesSlice.name,
		ballotParticipationSlice.name
	]}
);

function configureStore() {

	const reducer = combineReducers({
		[userSlice.name]: userSlice.reducer,
		[membersSlice.name]: membersSlice.reducer,
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
			attendancesSlice.name,
			ballotParticipationSlice.name
		],
		stateReconciler: autoMergeLevel2,
		transforms: [transformState],
		migrate: (state: any) => {
			if (state && state._persist && state._persist.version !== 3)
				return Promise.reject('Discard old version')
			return Promise.resolve(state);
		}
	};

	const middleware: Middleware[] = []; //[thunk];
	if (process.env.NODE_ENV !== 'production')
		middleware.push(createLogger({collapsed: true}));

	const store = configureReduxStore({
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
		store.dispatch(loadAttendances());
		store.dispatch(loadBallotParticipation());
	});

	return {store, persistor, reducer};
}

// Infer the `RootState` and `AppDispatch` types from the store itself
type StoreType = ReturnType<typeof configureStore>['store'];
export type RootState = ReturnType<ReturnType<typeof configureStore>['reducer']>;
export type AppDispatch = StoreType['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<Promise<ReturnType>, RootState, unknown, AnyAction>

export default configureStore;
