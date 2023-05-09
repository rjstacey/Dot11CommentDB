import { combineReducers, configureStore as configureReduxStore } from '@reduxjs/toolkit';
import type { ThunkAction, AnyAction, Middleware } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { get, set, del } from 'idb-keyval';
import {errorsSlice} from 'dot11-components';

import userSlice from './user';
import membersSlice, {loadMembers} from './members';
import ballotsSlice, {loadBallots} from './ballots';
import epollsSlice from './epolls';
import commentsSlice from './comments';
import commentsHistorySlice from './commentsHistory';
import resultsSlice from './results';
import votersSlice from './voters';
import votingPoolsSlice, {loadVotingPools} from './votingPools';
import offlineSlice, {registerOffline} from './offline';
import liveUpdateSlice, {registerLiveUpdate} from './liveUpdate';

const dataAppSliceNames = [
	membersSlice.name,
	ballotsSlice.name,
	epollsSlice.name,
	commentsSlice.name,
	commentsHistorySlice.name,
	resultsSlice.name,
	votersSlice.name,
	votingPoolsSlice.name
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
		[userSlice.name]: userSlice.reducer,
		[membersSlice.name]: membersSlice.reducer,
		[ballotsSlice.name]: ballotsSlice.reducer,
		[epollsSlice.name]: epollsSlice.reducer,
		[commentsSlice.name]: commentsSlice.reducer,
		[commentsHistorySlice.name]: commentsHistorySlice.reducer,
		[resultsSlice.name]: resultsSlice.reducer,
		[votersSlice.name]: votersSlice.reducer,
		[votingPoolsSlice.name]: votingPoolsSlice.reducer,
		[errorsSlice.name]: errorsSlice.reducer,
		[offlineSlice.name]: offlineSlice.reducer,
		[liveUpdateSlice.name]: liveUpdateSlice.reducer
	});

	const middleware: Middleware[] = []; //[thunk];
	if (process.env.NODE_ENV !== 'production')
		middleware.push(createLogger({collapsed: true}));

	const persistConfig = {
		key: 'comments',
		version: 3,
		storage: {	// IndexedDB for storage using idb-keyval
			setItem: set,
			getItem: get,
			removeItem: del
		},
		whitelist: [
			membersSlice.name,
			ballotsSlice.name,
			commentsSlice.name,
			resultsSlice.name,
			votersSlice.name,
			votingPoolsSlice.name
		],
		transforms: [transformState],
		stateReconciler: autoMergeLevel2,
		migrate: (state: any) => {
			if (state && state._persist && state._persist.version !== 2)
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

		registerOffline(store);
		registerLiveUpdate(store);

		// After hydrate, load the latest
		store.dispatch(loadMembers());
		store.dispatch(loadBallots());
		store.dispatch(loadVotingPools());
	});

	return {store, persistor, reducer}
}

// Infer the `RootState` and `AppDispatch` types from the store itself
export type StoreType = ReturnType<typeof configureStore>['store'];
export type RootState = ReturnType<ReturnType<typeof configureStore>['reducer']>;
export type AppDispatch = StoreType['dispatch'];
export type AppThunk<ReturnType = void> = ThunkAction<Promise<ReturnType>, RootState, unknown, AnyAction>
