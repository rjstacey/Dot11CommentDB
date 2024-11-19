import {
	combineReducers,
	configureStore as configureReduxStore,
} from "@reduxjs/toolkit";
import type { Action, ThunkAction, Middleware } from "@reduxjs/toolkit";

import { createLogger } from "redux-logger";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import autoMergeLevel2 from "redux-persist/lib/stateReconciler/autoMergeLevel2";
import { get, set, del } from "idb-keyval";

import { errorsSlice } from "dot11-components";

import userSlice from "./user";
import timeZonesSlice from "./timeZones";
import groupsSlice from "./groups";
import pollingSocketSlice from "./pollingSocket";

const RESET_STORE_ACTION = "root/RESET_STORE";
const PERSIST_VERSION = 1;

/* Transform presistant state so that we reset "loading" state */
const transformState = createTransform(
	(state: any) => {
		const { loading, ...rest } = state;
		return rest;
	},
	(state) => ({ ...state, loading: false }),
	{
		whitelist: [],
	}
);

const appReducer = combineReducers({
	[userSlice.name]: userSlice.reducer,
	[timeZonesSlice.name]: timeZonesSlice.reducer,
	[groupsSlice.name]: groupsSlice.reducer,
	[pollingSocketSlice.name]: pollingSocketSlice.reducer,
	[errorsSlice.name]: errorsSlice.reducer,
});

const rootReducer = (state: any, action: Action) => {
	if (action.type === RESET_STORE_ACTION) state = undefined;
	return appReducer(state, action);
};

const persistConfig = {
	key: "polling",
	version: PERSIST_VERSION,
	storage: {
		// IndexedDB for storage using idb-keyval
		setItem: set,
		getItem: get,
		removeItem: del,
	},
	whitelist: [userSlice.name, timeZonesSlice.name, groupsSlice.name],
	stateReconciler: autoMergeLevel2,
	transforms: [transformState],
	migrate: (state: any) => {
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
	middleware.push(createLogger({ collapsed: true }));

export const store = configureReduxStore({
	reducer: persistReducer(persistConfig, rootReducer as any),
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false,
		}).concat(middleware),
});

export const persistor = persistStore(store, null);

export const resetStore = (): Action => ({ type: RESET_STORE_ACTION });

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
	Promise<ReturnType>,
	RootState,
	unknown,
	Action
>;
