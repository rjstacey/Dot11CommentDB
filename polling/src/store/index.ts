import {
	combineReducers,
	configureStore as configureReduxStore,
} from "@reduxjs/toolkit";
import type { Action, ThunkAction, Middleware } from "@reduxjs/toolkit";

import { createLogger } from "redux-logger";
import {
	persistStore,
	persistReducer,
	createTransform,
	PersistConfig,
} from "redux-persist";
import autoMergeLevel2 from "redux-persist/lib/stateReconciler/autoMergeLevel2";
import { get, set, del } from "idb-keyval";

import {
	errorsSlice,
	userSlice,
	createPersistReady,
	RESET_STORE_ACTION,
} from "@common";

import timeZonesSlice from "./timeZones";
import groupsSlice from "./groups";
import membersSlice from "./members";
import pollingSocketSlice from "./pollingSocket";
import pollingAdminSlice from "./pollingAdmin";
import pollingUserSlice from "./pollingUser";

export { setUser, selectUser, setError, resetStore } from "@common";

const PERSIST_VERSION = 1;

/* Transform presistant state so that we reset "loading" state */
type GenericObject = Record<string, unknown>;
const transformState = createTransform(
	(state: GenericObject) => {
		const { loading, ...rest } = state;
		return rest;
	},
	(state: GenericObject) => ({ ...state, loading: false }),
	{
		whitelist: [],
	}
);

const appReducer = combineReducers({
	[userSlice.name]: userSlice.reducer,
	[timeZonesSlice.name]: timeZonesSlice.reducer,
	[groupsSlice.name]: groupsSlice.reducer,
	[membersSlice.name]: membersSlice.reducer,
	[pollingSocketSlice.name]: pollingSocketSlice.reducer,
	[pollingAdminSlice.name]: pollingAdminSlice.reducer,
	[pollingUserSlice.name]: pollingUserSlice.reducer,
	[errorsSlice.name]: errorsSlice.reducer,
});

const rootReducer = (
	state: ReturnType<typeof appReducer> | undefined,
	action: Action<unknown>
) => {
	if (action.type === RESET_STORE_ACTION) state = undefined;
	return appReducer(state, action);
};

const persistConfig: PersistConfig<ReturnType<typeof appReducer>> = {
	key: "polling",
	version: PERSIST_VERSION,
	storage: {
		// IndexedDB for storage using idb-keyval
		setItem: set,
		getItem: get,
		removeItem: del,
	},
	whitelist: [
		userSlice.name,
		timeZonesSlice.name,
		groupsSlice.name,
		membersSlice.name,
	],
	stateReconciler: autoMergeLevel2,
	transforms: [transformState],
	migrate: (state) => {
		if (
			state &&
			state._persist &&
			state._persist.version !== PERSIST_VERSION
		)
			return Promise.reject("Discard old version");
		return Promise.resolve(state);
	},
};

const middleware: Middleware[] = [];
if (process.env.NODE_ENV !== "production")
	middleware.push(createLogger({ collapsed: true }) as Middleware);

export const store = configureReduxStore({
	reducer: persistReducer(persistConfig, rootReducer),
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false,
		}).concat(middleware),
});

export const persistor = persistStore(store);
export const persistReady = createPersistReady(persistor);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
	Promise<ReturnType>,
	RootState,
	unknown,
	Action
>;
